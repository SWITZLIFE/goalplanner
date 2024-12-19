import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { goals, tasks, rewards } from "@db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { generateTaskBreakdown } from "./openai";

export function registerRoutes(app: Express): Server {
  // Goals API
  app.get("/api/goals", async (req, res) => {
    try {
      const allGoals = await db.query.goals.findMany({
        with: {
          tasks: true,
        },
        orderBy: (goals, { desc }) => [desc(goals.createdAt)],
      });
      res.json(allGoals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const { title, description, targetDate, totalTasks } = req.body;
      
      // Generate task breakdown using AI
      const taskBreakdown = await generateTaskBreakdown(title, parseInt(totalTasks));
      const totalTaskCount = taskBreakdown.length + taskBreakdown.length * 3; // Main tasks + subtasks
      
      // Create the goal
      const [newGoal] = await db.insert(goals)
        .values({
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
            title: subtask,
            completed: false,
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

  // Rewards API
  app.get("/api/rewards", async (req, res) => {
    try {
      const [userRewards] = await db.select()
        .from(rewards)
        .where(eq(rewards.userId, 1)) // TODO: Replace with actual user ID when auth is added
        .limit(1);
      res.json(userRewards || { coins: 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
