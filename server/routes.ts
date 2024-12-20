import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { goals, tasks, rewards, timeTracking } from "@db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { generateTaskBreakdown, generateShortTitle } from "./openai";
import { getCoachingAdvice } from "./coaching";
import { setupAuth } from "./auth";

export function registerRoutes(app: Express): Server {
  // Setup authentication middleware and routes
  setupAuth(app);
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
      console.error("Failed to fetch goals:", error);
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const { title, description, targetDate, totalTasks } = req.body;
      
      // Generate a shorter title using AI
      const shortTitle = await generateShortTitle(title);
      
      const [newGoal] = await db.insert(goals)
        .values({
          title: shortTitle,
          description: title, // Store original title as description
          targetDate: new Date(targetDate),
          totalTasks: totalTasks,
          progress: 0,
        })
        .returning();

      // Create tasks and subtasks
      if (totalTasks > 0) {
        const breakdown = await generateTaskBreakdown(title, parseInt(totalTasks));
        
        for (const task of breakdown) {
          const [mainTask] = await db.insert(tasks)
            .values({
              goalId: newGoal.id,
              title: task.title,
              completed: false,
              isSubtask: false,
            })
            .returning();

          // Create subtasks
          for (const subtask of task.subtasks) {
            await db.insert(tasks)
              .values({
                goalId: newGoal.id,
                title: subtask.title,
                completed: false,
                estimatedMinutes: subtask.estimatedMinutes,
                isSubtask: true,
                parentTaskId: mainTask.id,
              });
          }
        }
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
  // Delete goal endpoint
  app.delete("/api/goals/:goalId", async (req, res) => {
    try {
      const { goalId } = req.params;
      
      // First, delete all tasks associated with the goal
      await db.delete(tasks)
        .where(eq(tasks.goalId, parseInt(goalId)));

      // Then delete the goal
      const [deletedGoal] = await db.delete(goals)
        .where(eq(goals.id, parseInt(goalId)))
        .returning();

      if (!deletedGoal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete goal:", error);
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });


  // Tasks API
  app.post("/api/goals/:goalId/tasks", async (req, res) => {
    try {
      const { goalId } = req.params;
      const { title, isSubtask, parentTaskId, plannedDate } = req.body;
      
      const [newTask] = await db.insert(tasks)
        .values({
          goalId: parseInt(goalId),
          title,
          completed: false,
          isSubtask: isSubtask || false,
          parentTaskId: parentTaskId || null,
          plannedDate: plannedDate ? new Date(plannedDate) : null,
        })
        .returning();
      
      res.json(newTask);
    } catch (error) {
      console.error("Failed to create task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const { completed, title, estimatedMinutes, plannedDate } = req.body;
      
      const updateData: Partial<typeof tasks.$inferInsert> = {};
      if (typeof completed !== 'undefined') updateData.completed = completed;
      if (title) updateData.title = title;
      if (typeof estimatedMinutes !== 'undefined') updateData.estimatedMinutes = estimatedMinutes;
      if (plannedDate !== undefined) {
        updateData.plannedDate = plannedDate ? new Date(plannedDate) : null;
      }

      console.log('Updating task with data:', { taskId, updateData });

      console.log('Updating task:', { taskId, updateData }); // Add logging

      const [updatedTask] = await db.update(tasks)
        .set(updateData)
        .where(eq(tasks.id, parseInt(taskId)))
        .returning();

      if (!updatedTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Update goal progress
      if (updatedTask && typeof completed !== 'undefined') {
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

  // Delete task endpoint
  app.delete("/api/tasks/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const taskIdInt = parseInt(taskId);

      // First, verify the task exists and get its details
      const taskToDelete = await db.query.tasks.findFirst({
        where: eq(tasks.id, taskIdInt)
      });

      if (!taskToDelete) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Delete all subtasks first
      await db.delete(tasks)
        .where(eq(tasks.parentTaskId, taskIdInt));

      // Then delete the main task
      const [deletedTask] = await db.delete(tasks)
        .where(eq(tasks.id, taskIdInt))
        .returning();

      // Update goal progress
      const remainingTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.goalId, taskToDelete.goalId));
      
      if (remainingTasks.length > 0) {
        const completedTasks = remainingTasks.filter(t => t.completed).length;
        const progress = Math.round((completedTasks / remainingTasks.length) * 100);
        
        await db.update(goals)
          .set({ progress })
          .where(eq(goals.id, taskToDelete.goalId));
      } else {
        // If no tasks remain, set progress to 0
        await db.update(goals)
          .set({ progress: 0 })
          .where(eq(goals.id, taskToDelete.goalId));
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ 
        error: "Failed to delete task",
        details: error instanceof Error ? error.message : "Unknown error"
      });
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

  // Time Tracking API
  app.post("/api/tasks/:taskId/timer/start", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = 1; // TODO: Replace with actual user ID from auth

      // Check if there's already an active timer
      const activeTimer = await db.query.timeTracking.findFirst({
        where: and(
          eq(timeTracking.userId, userId),
          eq(timeTracking.isActive, true)
        ),
      });

      if (activeTimer) {
        return res.status(400).json({ error: "Another timer is already active" });
      }

      // Start new timer
      const [timer] = await db.insert(timeTracking)
        .values({
          userId,
          taskId: parseInt(taskId),
          startTime: new Date(),
          isActive: true,
        })
        .returning();

      res.json(timer);
    } catch (error) {
      console.error("Failed to start timer:", error);
      res.status(500).json({ error: "Failed to start timer" });
    }
  });

  app.post("/api/tasks/:taskId/timer/stop", async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = 1; // TODO: Replace with actual user ID from auth

      // Find active timer
      const activeTimer = await db.query.timeTracking.findFirst({
        where: and(
          eq(timeTracking.userId, userId),
          eq(timeTracking.taskId, parseInt(taskId)),
          eq(timeTracking.isActive, true)
        ),
      });

      if (!activeTimer) {
        return res.status(404).json({ error: "No active timer found" });
      }

      // Calculate coins earned (1 coin per minute)
      const endTime = new Date();
      const minutesWorked = Math.floor((endTime.getTime() - activeTimer.startTime.getTime()) / 60000);
      const coinsEarned = Math.max(1, minutesWorked); // Minimum 1 coin

      // Update timer
      const [updatedTimer] = await db.update(timeTracking)
        .set({
          endTime,
          isActive: false,
          coinsEarned,
        })
        .where(eq(timeTracking.id, activeTimer.id))
        .returning();

      // Update task's total time and get updated task
      const [updatedTask] = await db.update(tasks)
        .set({
          totalMinutesSpent: sql`${tasks.totalMinutesSpent} + ${minutesWorked}`,
        })
        .where(eq(tasks.id, parseInt(taskId)))
        .returning();

      // Update user's coins - ensure the rewards record exists first
      const [userRewards] = await db.select()
        .from(rewards)
        .where(eq(rewards.userId, userId))
        .limit(1);

      if (!userRewards) {
        // Create initial rewards record if it doesn't exist
        await db.insert(rewards)
          .values({
            userId,
            coins: coinsEarned,
            lastUpdated: new Date(),
          });
      } else {
        // Update existing rewards
        await db.update(rewards)
          .set({
            coins: sql`${rewards.coins} + ${coinsEarned}`,
            lastUpdated: new Date(),
          })
          .where(eq(rewards.userId, userId));
      }

      res.json({
        timer: updatedTimer,
        task: updatedTask,
        coinsEarned,
      });
    } catch (error) {
      console.error("Failed to stop timer:", error);
      res.status(500).json({ error: "Failed to stop timer" });
    }
  });

  app.get("/api/timer/current", async (req, res) => {
    try {
      const userId = 1; // TODO: Replace with actual user ID from auth

      const activeTimer = await db.query.timeTracking.findFirst({
        where: and(
          eq(timeTracking.userId, userId),
          eq(timeTracking.isActive, true)
        ),
        with: {
          task: true,
        },
      });

      res.json(activeTimer || null);
    } catch (error) {
      console.error("Failed to fetch current timer:", error);
      res.status(500).json({ error: "Failed to fetch current timer" });
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

  app.get("/api/rewards/items", async (req, res) => {
    try {
      const items = await db.select().from(rewardItems);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reward items" });
    }
  });

  app.post("/api/rewards/purchase/:itemId", async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const userId = 1; // TODO: Replace with actual user ID when auth is added

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