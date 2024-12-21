import type { Express } from "express";
import { openai } from "./openai";
import { createServer, type Server } from "http";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { rewards, rewardItems, purchasedRewards } from "@db/schema";
import { goals, tasks,  timeTracking, visionBoardImages } from "@db/schema";
import { and, isNull, sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for handling file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
import { generateTaskBreakdown, generateShortTitle } from "./openai";
import { getCoachingAdvice } from "./coaching";
import { setupAuth } from "./auth";
import express from 'express';

export function registerRoutes(app: Express): Server {
  // Setup authentication middleware and routes
  setupAuth(app);
  
  // Ensure uploads directory exists and serve uploaded files
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // put application routes here
  // prefix all routes with /api
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
        
        console.log('Task breakdown from OpenAI:', JSON.stringify(breakdown, null, 2));
        
        // Create tasks in the order they come from OpenAI
        // OpenAI has been instructed to return them in chronological order
        for (const task of breakdown) {
          const [mainTask] = await db.insert(tasks)
            .values({
              goalId: newGoal.id,
              title: task.title,
              completed: false,
              isSubtask: false,
              isAiGenerated: true,
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
      const goalIdInt = parseInt(goalId);

      // First verify the goal exists
      const goalToDelete = await db.query.goals.findFirst({
        where: eq(goals.id, goalIdInt),
        with: {
          tasks: true
        }
      });

      if (!goalToDelete) {
        return res.status(404).json({ error: "Goal not found" });
      }

      // Delete in correct order to handle foreign key constraints
      
      // 1. Delete all time tracking records for tasks in this goal
      for (const task of goalToDelete.tasks) {
        await db.delete(timeTracking)
          .where(eq(timeTracking.taskId, task.id));
      }

      // 2. Delete all tasks associated with the goal
      await db.delete(tasks)
        .where(eq(tasks.goalId, goalIdInt));

      // 3. Finally delete the goal
      await db.delete(goals)
        .where(eq(goals.id, goalIdInt));

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete goal:", error);
      res.status(500).json({ 
        error: "Failed to delete goal",
        details: error instanceof Error ? error.message : "Unknown error"
      });
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
      // Destructure only the fields we want to update, ignoring order
  const { completed, title, estimatedMinutes, plannedDate, notes } = req.body;
      
      const updateData: Partial<typeof tasks.$inferInsert> = {};
      if (typeof completed !== 'undefined') updateData.completed = completed;
      if (title) updateData.title = title;
      if (typeof estimatedMinutes !== 'undefined') updateData.estimatedMinutes = estimatedMinutes;
      if (plannedDate !== undefined) {
        updateData.plannedDate = plannedDate ? new Date(plannedDate) : null;
      }
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      console.log('Updating task with data:', { taskId, updateData, notes: req.body.notes });

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

      // First delete any time tracking records for this task
      await db.delete(timeTracking)
        .where(eq(timeTracking.taskId, taskIdInt));

      // Then delete all subtasks and their time tracking records
      const subtasks = await db.select()
        .from(tasks)
        .where(eq(tasks.parentTaskId, taskIdInt));
        
      for (const subtask of subtasks) {
        await db.delete(timeTracking)
          .where(eq(timeTracking.taskId, subtask.id));
      }
      
      await db.delete(tasks)
        .where(eq(tasks.parentTaskId, taskIdInt));

      // Finally delete the main task
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

// Vision Statement Generation API
app.post("/api/goals/:goalId/vision", async (req, res) => {
  try {
    const { goalId } = req.params;
    const { answers } = req.body;

    // Get the goal details first
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, parseInt(goalId)),
    });

    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Generate vision statement using OpenAI
    const prompt = `Based on the following responses about the goal "${goal.title}", craft an inspiring and motivational vision statement that captures the essence of their ambition and motivation. Keep it concise (2-3 sentences) but powerful.

Responses to vision questions:
${answers.map((answer: string, index: number) => `${index + 1}. ${answer}`).join('\n')}

Generate a vision statement that:
1. Emphasizes their deeper motivation
2. Highlights the positive impact
3. Paints a vivid picture of success
4. Incorporates their personal strengths
`;

    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a motivational coach who crafts inspiring vision statements. Be concise but impactful."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const visionStatement = openaiResponse.choices[0].message.content?.trim();

    // Update the goal with the new vision statement
    await db.update(goals)
      .set({ visionStatement })
      .where(eq(goals.id, parseInt(goalId)));

    res.json({ visionStatement });
  } catch (error) {
    console.error("Failed to generate vision statement:", error);
    res.status(500).json({ error: "Failed to generate vision statement" });
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

  // Vision Board API
  app.get("/api/vision-board", async (req, res) => {
    try {
      const userId = 1; // TODO: Replace with actual user ID from auth
      const images = await db.select()
        .from(visionBoardImages)
        .where(eq(visionBoardImages.userId, userId))
        .orderBy(visionBoardImages.position);
      res.json(images);
    } catch (error) {
      console.error("Failed to fetch vision board images:", error);
      res.status(500).json({ error: "Failed to fetch vision board images" });
    }
  });

  app.post("/api/vision-board/upload", upload.single('image'), async (req, res) => {
    try {
      console.log('Processing image upload request:', req.file);
      const userId = 1; // TODO: Replace with actual user ID from auth

      // Check if user already has 12 images
      const imageCount = await db.select({ count: sql<number>`count(*)` })
        .from(visionBoardImages)
        .where(eq(visionBoardImages.userId, userId));

      console.log('Current image count:', imageCount[0].count);

      if (imageCount[0].count >= 12) {
        return res.status(400).json({ error: "Maximum number of images (12) reached" });
      }

      // Find the next available position
      const existingPositions = await db.select({ position: visionBoardImages.position })
        .from(visionBoardImages)
        .where(eq(visionBoardImages.userId, userId));
      
      const usedPositions = existingPositions.map(img => img.position);
      let nextPosition = 0;
      while (usedPositions.includes(nextPosition)) {
        nextPosition++;
      }

      console.log('Using position:', nextPosition);

      if (!req.file) {
        console.error('No file uploaded');
        return res.status(400).json({ error: "No image file provided" });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      console.log('Image URL:', imageUrl);

      const [newImage] = await db.insert(visionBoardImages)
        .values({
          userId,
          imageUrl,
          position: nextPosition,
        })
        .returning();

      res.json(newImage);
    } catch (error) {
      console.error("Failed to upload image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  app.delete("/api/vision-board/:id", async (req, res) => {
    try {
      const userId = 1; // TODO: Replace with actual user ID from auth
      const imageId = parseInt(req.params.id);

      const [deletedImage] = await db.delete(visionBoardImages)
        .where(
          and(
            eq(visionBoardImages.id, imageId),
            eq(visionBoardImages.userId, userId)
          )
        )
        .returning();

      if (!deletedImage) {
        return res.status(404).json({ error: "Image not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete image:", error);
      res.status(500).json({ error: "Failed to delete image" });
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
      const items = await db.query.rewardItems.findMany({
        orderBy: (rewardItems, { asc }) => [asc(rewardItems.cost)],
      });
      console.log('Fetched reward items:', items);
      res.json(items);
    } catch (error) {
      console.error('Error fetching reward items:', error);
      res.status(500).json({ error: "Failed to fetch reward items" });
    }
  });
  // Get purchased rewards
  app.get("/api/rewards/purchased", async (req, res) => {
    try {
      const userId = 1; // TODO: Replace with actual user ID when auth is added
      
      const purchasedItems = await db.query.purchasedRewards.findMany({
        where: eq(purchasedRewards.userId, userId),
        with: {
          rewardItem: true,
        },
        orderBy: (purchasedRewards, { desc }) => [desc(purchasedRewards.purchasedAt)],
      });

      console.log('Fetched purchased items:', JSON.stringify(purchasedItems, null, 2));
      res.json(purchasedItems);
    } catch (error) {
      console.error('Error fetching purchased rewards:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      res.status(500).json({ error: "Failed to fetch purchased rewards" });
    }
  });


  app.post("/api/rewards/purchase/:itemId", async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const userId = 1; // TODO: Replace with actual user ID when auth is added

      // Get the reward item with error handling
      const items = await db.select()
        .from(rewardItems)
        .where(eq(rewardItems.id, itemId));

      const item = items[0];
      if (!item) {
        return res.status(404).json({ 
          error: "Reward item not found",
          message: "The requested reward item could not be found"
        });
      }

      // Get user's current coins with error handling
      const userRewardsResult = await db.select()
        .from(rewards)
        .where(eq(rewards.userId, userId));

      const userRewards = userRewardsResult[0];
      if (!userRewards) {
        return res.status(404).json({ 
          error: "User rewards not found",
          message: "Could not find rewards record for user"
        });
      }

      if (userRewards.coins < item.cost) {
        return res.status(400).json({
          error: "Insufficient coins",
          message: `You need ${item.cost} coins but only have ${userRewards.coins}`,
          required: item.cost,
          available: userRewards.coins
        });
      }

      // Update user's coins with validation
      const [updatedRewards] = await db.update(rewards)
        .set({ 
          coins: userRewards.coins - item.cost,
          lastUpdated: new Date()
        })
        .where(eq(rewards.userId, userId))
        .returning();

      if (!updatedRewards) {
        throw new Error("Failed to update user rewards");
      }

      // Record the purchase
      const [purchaseRecord] = await db.insert(purchasedRewards)
        .values({
          userId,
          rewardItemId: itemId,
          purchasedAt: new Date()
        })
        .returning();

      res.json({ 
        message: "Purchase successful",
        item: {
          name: item.name,
          cost: item.cost
        },
        newBalance: updatedRewards.coins,
        purchaseRecord
      });
    } catch (error) {
      console.error("Purchase error:", error);
      res.status(500).json({ 
        error: "Failed to process purchase",
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}