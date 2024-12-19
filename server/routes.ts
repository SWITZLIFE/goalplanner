import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { goals, tasks, rewards, rewardItems, type User } from "@db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { generateTaskBreakdown } from "./openai";
import { getCoachingAdvice } from "./coaching";
import { setupAuth } from "./auth";

// Extend Express.User with our User type
// Import the type from auth.ts
import type { AuthUser } from "./auth";

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

export function registerRoutes(app: Express): Server {
  // Setup authentication routes and middleware
  setupAuth(app);
  // Goals API
  app.get("/api/goals", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Fetch all goals for the authenticated user
      const userGoals = await db
        .select({
          id: goals.id,
          title: goals.title,
          description: goals.description,
          targetDate: goals.targetDate,
          progress: goals.progress,
          totalTasks: goals.totalTasks,
          createdAt: goals.createdAt,
        })
        .from(goals)
        .where(eq(goals.userId, req.user.id))
        .orderBy(desc(goals.createdAt));

      // For each goal, fetch its tasks
      const goalsWithTasks = await Promise.all(
        userGoals.map(async (goal) => {
          const goalTasks = await db
            .select({
              id: tasks.id,
              title: tasks.title,
              completed: tasks.completed,
              estimatedMinutes: tasks.estimatedMinutes,
              createdAt: tasks.createdAt,
              isSubtask: tasks.isSubtask,
              parentTaskId: tasks.parentTaskId,
            })
            .from(tasks)
            .where(eq(tasks.goalId, goal.id));

          return {
            ...goal,
            tasks: goalTasks,
          };
        })
      );

      res.json(goalsWithTasks);
    } catch (error: any) {
      console.error("Failed to fetch goals:", error);
      res.status(500).json({ 
        error: "Failed to fetch goals",
        details: error.message 
      });
    }
  });

  app.post("/api/goals", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { title, description, targetDate, totalTasks } = req.body;
      
      // Generate task breakdown using AI
      const taskBreakdown = await generateTaskBreakdown(title, parseInt(totalTasks));
      const totalTaskCount = taskBreakdown.length + taskBreakdown.length * 3; // Main tasks + subtasks
      
      // Create the goal
      const [newGoal] = await db.insert(goals)
        .values({
          userId: req.user.id,
          title,
          description,
          targetDate: new Date(targetDate),
          totalTasks: totalTaskCount,
          progress: 0,
        })
        .returning();

      // Create tasks and subtasks
      for (const task of taskBreakdown) {
        const [mainTask] = await db.insert(tasks)
          .values({
            goalId: newGoal.id,
            title: task.title,
            completed: false,
            isSubtask: false,
          })
          .returning();

        // Create subtasks
        await db.insert(tasks)
          .values(task.subtasks.map(subtask => ({
            goalId: newGoal.id,
            title: subtask.title,
            completed: false,
            estimatedMinutes: subtask.estimatedMinutes,
            isSubtask: true,
            parentTaskId: mainTask.id,
          })));
      }

      // Fetch the complete goal with tasks
      const goalWithTasks = await db.query.goals.findFirst({
        where: eq(goals.id, newGoal.id),
        with: {
          tasks: true,
        },
      });

      res.json(goalWithTasks);
    } catch (error) {
      console.error("Failed to create goal:", error);
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  // Tasks API
  app.post("/api/goals/:goalId/tasks", async (req, res) => {
    try {
      const { goalId } = req.params;
      const { title } = req.body;
      const [newTask] = await db.insert(tasks)
        .values({
          goalId: parseInt(goalId),
          title,
          completed: false,
        })
        .returning();
      res.json(newTask);
    } catch (error) {
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const { completed } = req.body;
      
      const [updatedTask] = await db.update(tasks)
        .set({ completed })
        .where(eq(tasks.id, parseInt(taskId)))
        .returning();

      // Update goal progress
      if (updatedTask) {
        const goalTasks = await db.select()
          .from(tasks)
          .where(eq(tasks.goalId, updatedTask.goalId));
        
        const completedTasks = goalTasks.filter(t => t.completed).length;
        const progress = Math.round((completedTasks / goalTasks.length) * 100);
        
        await db.update(goals)
          .set({ progress })
          .where(eq(goals.id, updatedTask.goalId));
      }

      res.json(updatedTask);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // AI Coaching API
  app.get("/api/goals/:goalId/coaching", async (req, res) => {
    res.json({
      message: "Hey! I'm your AI coach. Let me know if you need help with anything!",
      type: "welcome"
    });
  });

  app.post("/api/goals/:goalId/coaching/chat", async (req, res) => {
    try {
      const { goalId } = req.params;
      const { message } = req.body;
      
      const goal = await db.query.goals.findFirst({
        where: eq(goals.id, parseInt(goalId)),
        with: {
          tasks: true,
        },
      });

      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      const response = await getCoachingAdvice(goal, goal.tasks || [], message);
      
      // Ensure we always return an array of messages
      const messages = Array.isArray(response.messages) ? response.messages : [response.messages];
      res.json({
        messages,
        type: "response"
      });
    } catch (error) {
      console.error("Failed to get coaching advice:", error);
      res.status(500).json({ error: "Failed to get coaching advice" });
    }
  });

  // Rewards API
  app.get("/api/rewards", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const [userRewards] = await db.select()
        .from(rewards)
        .where(eq(rewards.userId, req.user.id))
        .limit(1);
      
      if (!userRewards) {
        // Create initial rewards for new user
        const [newRewards] = await db.insert(rewards)
          .values({
            userId: req.user.id,
            coins: 0,
          })
          .returning();
        return res.json(newRewards);
      }
      
      res.json(userRewards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  app.get("/api/rewards/items", async (req, res) => {
    try {
      const items = await db.select().from(rewardItems);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reward items" });
    }
  });

  app.post("/api/rewards/purchase/:itemId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const itemId = parseInt(req.params.itemId);
      const userId = req.user.id;

      // Get the reward item
      const [item] = await db.select()
        .from(rewardItems)
        .where(eq(rewardItems.id, itemId))
        .limit(1);

      if (!item) {
        return res.status(404).send("Reward item not found");
      }

      // Get user's current coins
      const [userRewards] = await db.select()
        .from(rewards)
        .where(eq(rewards.userId, userId))
        .limit(1);

      if (!userRewards || userRewards.coins < item.cost) {
        return res.status(400).send("Insufficient coins");
      }

      // Update user's coins
      await db.update(rewards)
        .set({ 
          coins: userRewards.coins - item.cost,
          lastUpdated: new Date()
        })
        .where(eq(rewards.userId, userId));

      res.json({ message: "Purchase successful" });
    } catch (error) {
      res.status(500).json({ error: "Failed to process purchase" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
