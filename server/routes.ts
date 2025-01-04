import type { Express, Request, Response, NextFunction } from "express";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { 
  notes, users, rewards, rewardItems, purchasedRewards,
  goals, tasks, timeTracking, visionBoardImages, 
  dailyInspirations, coinHistory, forumCategories, forumPosts,
  forumComments, forumReactions
} from "@db/schema";
import { getTodayMessage, markMessageAsRead, generateDailyMessage } from "./future-message";
import { createServer, type Server } from "http";
import { db } from "@db";
import multer from "multer";
import path from "path";
import fs from "fs";
import { generateTaskBreakdown, generateShortTitle, openai } from "./openai";
import { getCoachingAdvice } from "./coaching";
import { setupAuth } from "./auth";
import { uploadFileToSupabase } from './supabase';
import { getTodayQuote, markQuoteAsRead } from "./goal-quotes";
import { registerGoogleOAuthRoutes } from "./google-oauth";
import { supabase } from './supabase';
import { format } from 'date-fns';

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Add proper MIME type checking
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedMimes.includes(file.mimetype)) {
      console.error('Invalid file type:', file.mimetype);
      return cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed!'));
    }

    console.log('Accepting file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Authentication middleware with proper session handling
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "You must be logged in to access this resource" });
  }

  // Add session timestamp
  if (req.session && !req.session.createdAt) {
    (req.session as any).createdAt = new Date();
  }

  // Session expiry check
  if (req.session && (req.session as any).createdAt) {
    const sessionStart = new Date((req.session as any).createdAt);
    const sessionAge = Date.now() - sessionStart.getTime();
    if (sessionAge > 24 * 60 * 60 * 1000) {
      req.session.destroy((err) => {
        if (err) console.error("Session destruction failed:", err);
      });
      return res.status(401).json({ error: "Session expired" });
    }
  }

  next();
}

export function registerRoutes(app: Express): Server {
  // Setup authentication middleware and routes first
  setupAuth(app);

  registerGoogleOAuthRoutes(app);
  // Profile photo upload route
  app.post("/api/user/profile-photo", requireAuth, upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = req.user!.id;

      // Upload to Supabase storage
      const imageUrl = await uploadFileToSupabase(req.file);

      // Update user's profile photo URL in database
      const [updatedUser] = await db.update(users)
        .set({ profilePhotoUrl: imageUrl })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error("Failed to update user profile");
      }

      res.json({
        message: "Profile photo updated successfully",
        profilePhotoUrl: imageUrl
      });
    } catch (error) {
      console.error("Failed to upload profile photo:", error);
      res.status(500).json({ error: "Failed to upload profile photo" });
    }
  });

  app.post("/api/vision-board/upload", requireAuth, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        console.error('No file uploaded');
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = req.user!.id;

      console.log('Processing file upload:', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Upload to Supabase storage with error handling
      let imageUrl;
      try {
        imageUrl = await uploadFileToSupabase(req.file);
      } catch (uploadError) {
        console.error('Supabase upload failed:', uploadError);
        return res.status(500).json({ error: "Failed to upload image to storage" });
      }

      if (!imageUrl) {
        console.error('No image URL returned from upload');
        return res.status(500).json({ error: "Failed to get image URL" });
      }

      console.log('File uploaded, saving to database:', { imageUrl });

      // Get all existing images for the user
      const existingImages = await db.select()
        .from(visionBoardImages)
        .where(eq(visionBoardImages.userId, userId))
        .orderBy(visionBoardImages.position);

      // Find the first empty position from 0-11
      const usedPositions = new Set(existingImages.map(img => img.position));
      let position = 0;
      while (position < 12 && usedPositions.has(position)) {
        position++;
      }

      // If no empty positions (position >= 12), shift all images up and use position 0
      if (position >= 12) {
        // Delete the image at position 11 if it exists
        const lastImage = existingImages.find(img => img.position === 11);
        if (lastImage) {
          // Delete from storage
          const fileName = lastImage.imageUrl.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from('vision-board')
              .remove([fileName]);
          }
          // Delete from database
          await db.delete(visionBoardImages)
            .where(eq(visionBoardImages.id, lastImage.id));
        }

        // Shift all other images up one position
        for (let i = 10; i >= 0; i--) {
          const image = existingImages.find(img => img.position === i);
          if (image) {
            await db.update(visionBoardImages)
              .set({ position: i + 1 })
              .where(eq(visionBoardImages.id, image.id));
          }
        }
        position = 0;
      }

      // Save to database with the determined position
      const [newImage] = await db.insert(visionBoardImages)
        .values({
          userId,
          imageUrl,
          position,
        })
        .returning();

      if (!newImage) {
        console.error('Failed to save image to database');
        return res.status(500).json({ error: "Failed to save image" });
      }

      console.log('Vision board image created:', newImage);
      res.json(newImage);
    } catch (error) {
      console.error("Failed to process vision board upload:", error);
      res.status(500).json({ error: "Failed to process upload" });
    }
  });

  // Add vision board GET endpoint
  app.get("/api/vision-board", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      console.log('Fetching vision board images for user:', userId);

      const images = await db.select({
        id: visionBoardImages.id,
        imageUrl: visionBoardImages.imageUrl,
        position: visionBoardImages.position,
      })
        .from(visionBoardImages)
        .where(eq(visionBoardImages.userId, userId))
        .orderBy(visionBoardImages.position);

      console.log('Found vision board images:', images);
      res.json(images);
    } catch (error) {
      console.error("Failed to fetch vision board:", error);
      res.status(500).json({ error: "Failed to fetch vision board" });
    }
  });

  // Add vision board DELETE endpoint
  app.delete("/api/vision-board/:imageId", requireAuth, async (req, res) => {
    try {
      const { imageId } = req.params;
      const userId = req.user!.id;

      // First get the image details to get the URL
      const [image] = await db.select()
        .from(visionBoardImages)
        .where(and(
          eq(visionBoardImages.id, parseInt(imageId)),
          eq(visionBoardImages.userId, userId)
        ));

      if (!image) {
        return res.status(404).json({ error: "Image not found or unauthorized" });
      }

      // Extract file name from URL
      const fileName = image.imageUrl.split('/').pop();

      if (!fileName) {
        console.error('Could not extract filename from URL:', image.imageUrl);
        return res.status(500).json({ error: "Invalid image URL format" });
      }

      // Delete from Supabase storage
      const { error: deleteStorageError } = await supabase.storage
        .from('vision-board')
        .remove([fileName]);

      if (deleteStorageError) {
        console.error('Error deleting from storage:', deleteStorageError);
        return res.status(500).json({ error: "Failed to delete image from storage" });
      }

      // Delete from database
      await db.delete(visionBoardImages)
        .where(and(
          eq(visionBoardImages.id, parseInt(imageId)),
          eq(visionBoardImages.userId, userId)
        ));

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Failed to delete image:", error);
      res.status(500).json({ error: "Failed to delete image" });
    }
  });

  // Daily Inspiration API
  app.get("/api/goals/:goalId/inspiration", requireAuth, async (req, res) => {
    try {
      const { goalId } = req.params;
      const { date } = req.query;
      const userId = req.user!.id;

      // Check if inspiration exists for today
      const existingInspiration = await db.select()
        .from(dailyInspirations)
        .where(
          and(
            eq(dailyInspirations.userId, userId),
            eq(dailyInspirations.goalId, parseInt(goalId)),
            eq(dailyInspirations.date, date as string)
          )
        )
        .limit(1);

      if (existingInspiration.length > 0) {
        return res.json(existingInspiration[0]);
      }

      res.json({ content: null });
    } catch (error) {
      console.error("Failed to fetch inspiration:", error);
      res.status(500).json({ error: "Failed to fetch inspiration" });
    }
  });

  app.post("/api/goals/:goalId/inspiration", requireAuth, async (req, res) => {
    try {
      const { goalId } = req.params;
      const userId = req.user!.id;
      const today = format(new Date(), 'yyyy-MM-dd');

      // Get the goal details
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, parseInt(goalId)),
          eq(goals.userId, userId)
        ),
      });

      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }

      // Get all active goals for the user
      const userGoals = await db.select()
        .from(goals)
        .where(eq(goals.userId, userId));

      // Select a random goal from user's goals
      const randomGoal = userGoals[Math.floor(Math.random() * userGoals.length)];

      // Create a list of all goal titles
      const allGoalTitles = userGoals.map(g => g.title).join("\n- ");

      // Generate inspiration using OpenAI with a prompt that includes all goals
      const prompt = `Write an encouraging message (100-150 words) for someone working on a list of goals:

Their goals are:
- ${allGoalTitles}

For today's message, focus on their goal: "${randomGoal.title}"

The message should be:
- Written at an 8th grade reading level
- Warm and friendly, like advice from a mentor
- Include a specific tip or insight about personal growth

Focus on:
- Using simple, clear language
- Being encouraging without being overly complex
- Making the message feel personal and relatable
- Including one practical suggestion they can try today

The format should be:
1. A warm opening that acknowledges their effort
2. 2-3 paragraphs of encouragement and practical advice
3. End with an uplifting closing line
4. Always sign with "Your Goals Planner" on a new line

Write it in a conversational tone, like you're talking to a friend.`;

      const openaiResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a supportive mentor who gives clear, practical advice. Always write messages that are 100-150 words long and sign them as 'Your Goals Planner'."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
      });

      const inspirationContent = openaiResponse.choices[0].message.content?.trim();

      if (!inspirationContent) {
        throw new Error("Failed to generate inspiration content");
      }

      // Save the inspiration
      const [newInspiration] = await db.insert(dailyInspirations)
        .values({
          userId,
          goalId: parseInt(goalId),
          content: inspirationContent,
          date: today,
        })
        .returning();

      res.json(newInspiration);
    } catch (error) {
      console.error("Failed to generate inspiration:", error);
      res.status(500).json({ error: "Failed to generate inspiration" });
    }
  });

  // Configure CORS headers for Supabase Storage URLs
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.SUPABASE_URL || '*'); // Added default '*' for development
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  // Protect all /api routes except auth routes with enhanced session verification
  app.use('/api', (req, res, next) => {
    // Skip auth for public routes
    if (req.path.startsWith('/login') ||
      req.path.startsWith('/register') ||
      req.path.startsWith('/logout') ||
      req.path.startsWith('/user')) {
      return next();
    }

    // Enhanced session verification
    if (!req.isAuthenticated() || !req.session) {
      return res.status(401).json({ error: "You must be logged in to access this resource" });
    }

    // Strict user verification
    const userId = req.user?.id;
    if (!userId) {
      // Clear invalid session
      req.session.destroy((err) => {
        if (err) console.error("Session destruction failed:", err);
      });
      return res.status(401).json({ error: "Invalid user session" });
    }

    // Store userId in res.locals for route handlers
    res.locals.userId = userId;

    // Add timestamp verification
    const sessionStart = req.session.createdAt;
    if (!sessionStart) {
      req.session.createdAt = new Date();
    } else {
      // Check if session is too old (24 hours)
      const sessionAge = Date.now() - new Date(sessionStart).getTime();
      if (sessionAge > 24 * 60 * 60 * 1000) {
        req.session.destroy((err) => {
          if (err) console.error("Session destruction failed:", err);
        });
        return res.status(401).json({ error: "Session expired" });
      }
    }

    next();
  });

  // Goals API
  app.get("/api/goals", async (req, res) => {
    try {
      const userId = res.locals.userId; // Get userId from middleware
      console.log('Fetching goals for user:', userId);

      // First verify the user exists
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        console.error('User not found:', userId);
        return res.status(404).json({ error: "User not found" });
      }

      // Get all goals that belong to this user only with strict filtering
      const userGoals = await db.select({
        id: goals.id,
        title: goals.title,
        description: goals.description,
        targetDate: goals.targetDate,
        progress: goals.progress,
        totalTasks: goals.totalTasks,
        createdAt: goals.createdAt,
        visionStatement: goals.visionStatement,
        visionResponses: goals.visionResponses,
        userId: goals.userId, // Explicitly select userId to verify ownership
      })
        .from(goals)
        .where(eq(goals.userId, userId))
        .orderBy(desc(goals.createdAt));

      // Double check that all goals belong to the current user
      if (userGoals.some(goal => goal.userId !== userId)) {
        console.error('Data isolation breach detected');
        return res.status(500).json({ error: "Data isolation error" });
      }

      // For each goal, get its tasks
      const goalsWithTasks = await Promise.all(
        userGoals.map(async (goal) => {
          const goalTasks = await db.select()
            .from(tasks)
            .where(
              and(
                eq(tasks.goalId, goal.id),
                eq(tasks.userId, userId)
              )
            )
            .orderBy(tasks.createdAt);

          return {
            ...goal,
            tasks: goalTasks
          };
        })
      );

      console.log('Found goals:', goalsWithTasks.length);
      res.json(goalsWithTasks);
    } catch (error) {
      console.error("Failed to fetch goals:", error);
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", requireAuth, async (req, res) => {
    try {
      const { title, description, targetDate, totalTasks } = req.body;
      const userId = req.user!.id;
      console.log('Creating goal for user:', userId, 'with totalTasks:', totalTasks);

      // Verify user exists
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        console.error('User not found:', userId);
        return res.status(404).json({ error: "User not found" });
      }

      // Validate input
      if (!title || !targetDate) {
        return res.status(400).json({ error: "Title and target date are required" });
      }

      // Double check user authentication and authorization
      if (userId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized access" });
      }

      // Generate a shorter title using AI only if we're generating tasks
      const shortTitle = totalTasks > 0 ? await generateShortTitle(title) : title;
      console.log('Using title:', shortTitle);

      // Create the goal with strict user association
      const [newGoal] = await db.insert(goals)
        .values({
          userId,
          title: shortTitle,
          description: title, // Store original title as description
          targetDate: new Date(targetDate),
          totalTasks: totalTasks || 0,
          progress: 0,
        })
        .returning();

      if (!newGoal) {
        throw new Error('Failed to create goal');
      }

      // Verify the created goal belongs to the current user
      const [verifiedGoal] = await db.select()
        .from(goals)
        .where(and(
          eq(goals.id, newGoal.id),
          eq(goals.userId, userId)
        ))
        .limit(1);

      if (!verifiedGoal || verifiedGoal.userId !== userId) {
        await db.delete(goals).where(eq(goals.id, newGoal.id));
        throw new Error('Data isolation breach detected during goal creation');
      }

      console.log('Created and verified goal:', verifiedGoal);

      // Create tasks and subtasks only if totalTasks > 0
      let createdTasks = [];
      if (totalTasks > 0) {
        try {
          const breakdown = await generateTaskBreakdown(title, totalTasks);
          console.log('Task breakdown from OpenAI:', JSON.stringify(breakdown, null, 2));

          // Create tasks in the order they come from OpenAI
          for (const task of breakdown) {
            if (!task.title) continue;

            try {
              // Create main task with strict user association
              const [mainTask] = await db.insert(tasks)
                .values({
                  goalId: newGoal.id,
                  userId: userId,
                  title: task.title,
                  completed: false,
                  isSubtask: false,
                  isAiGenerated: true,
                })
                .returning();

              if (!mainTask) continue;

              createdTasks.push(mainTask);

              // Create subtasks with strict user association
              if (task.subtasks && Array.isArray(task.subtasks)) {
                for (const subtask of task.subtasks) {
                  if (!subtask.title) continue;

                  const [createdSubtask] = await db.insert(tasks)
                    .values({
                      goalId: newGoal.id,
                      userId: userId,
                      title: subtask.title,
                      completed: false,
                      estimatedMinutes: subtask.estimatedMinutes || null,
                      isSubtask: true,
                      parentTaskId: mainTask.id,
                      isAiGenerated: true,
                    })
                    .returning();

                  if (createdSubtask) {
                    createdTasks.push(createdSubtask);
                  }
                }
              }
            } catch (taskError) {
              console.error('Error creating task:', taskError);
              continue;
            }
          }
        } catch (breakdownError) {
          console.error('Error generating task breakdown:', breakdownError);
        }
      }

      // Return the goal with any created tasks
      const response = {
        ...verifiedGoal,
        tasks: createdTasks
      };

      res.json(response);
    } catch (error) {
      console.error("Failed to create goal:", error);
      res.status(500).json({ error: "Failed to create goal" });
    }
  });

  // Delete goal endpoint
  app.delete("/api/goals/:goalId", requireAuth, async (req, res) => {
    try {
      const { goalId } = req.params;
      const goalIdInt = parseInt(goalId);
      const userId = req.user!.id;

      // First verify the goal exists and belongs to the user
      const goalToDelete = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, goalIdInt),
          eq(goals.userId, userId)
        ),
        with: {
          tasks: true
        }
      });

      if (!goalToDelete) {
        return res.status(404).json({ error: "Goal not found or unauthorized" });
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
        .where(and(
          eq(goals.id, goalIdInt),
          eq(goals.userId, userId)
        ));

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete goal:", error);
      res.status(500).json({
        error: "Failed to delete goal",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update goal endpoint
  app.patch("/api/goals/:goalId", requireAuth, async (req, res) => {
    try {
      const { goalId } = req.params;
      const { visionStatement } = req.body;
      const userId = req.user!.id;

      // Verify the goal belongs to the user
      const [goal] = await db.select()
        .from(goals)
        .where(and(
          eq(goals.id, parseInt(goalId)),
          eq(goals.userId, userId)
        ))
        .limit(1);

      if (!goal) {
        return res.status(404).json({ error: "Goal not found or unauthorized" });
      }

      // Update the goal
      const [updatedGoal] = await db.update(goals)
        .set({
          visionStatement: visionStatement
        })
        .where(and(
          eq(goals.id, parseInt(goalId)),
          eq(goals.userId, userId)
        ))
        .returning();

      if (!updatedGoal) {
        return res.status(500).json({ error: "Failed to update goal" });
      }

      res.json(updatedGoal);
    } catch (error) {
      console.error("Failed to update goal:", error);
      res.status(500).json({
        error: "Failed to update goal",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Tasks API
  app.post("/api/goals/:goalId/tasks", requireAuth, async (req, res) => {
    try {
      const { goalId } = req.params;
      const { title, isSubtask, parentTaskId, plannedDate } = req.body;
      const userId = req.user!.id;

      // Verify the goal belongs to the user
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, parseInt(goalId)),
          eq(goals.userId, userId)
        )
      });

      if (!goal) {
        return res.status(404).json({ error: "Goal not found or unauthorized" });
      }

      // If this is a subtask, verify the parent task belongs to the user
      if (parentTaskId) {
        const parentTask = await db.query.tasks.findFirst({
          where: and(
            eq(tasks.id, parentTaskId),
            eq(tasks.userId, userId)
          )
        });

        if (!parentTask) {
          return res.status(404).json({ error: "Parent task not found or unauthorized" });
        }
      }

      const [newTask] = await db.insert(tasks)
        .values({
          goalId: parseInt(goalId),
          userId, // Ensure task is associated with the correct user
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

  app.patch("/api/tasks/:taskId", requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.id;
      const { completed, title, estimatedMinutes, plannedDate, notes } = req.body;

      // First verify the task belongs to the user
      const task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, parseInt(taskId)),
          eq(tasks.userId, userId)
        )
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found or unauthorized" });
      }

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

      console.log('Updating task with data:', { taskId, updateData });

      const [updatedTask] = await db.update(tasks)
        .set(updateData)
        .where(and(
          eq(tasks.id, parseInt(taskId)),
          eq(tasks.userId, userId)
        ))
        .returning();

      if (!updatedTask) {
        return res.status(404).json({ error: "Task not found or unauthorized" });
      }

      // Update goal progress
      if (updatedTask && typeof completed !== 'undefined') {
        const goalTasks = await db.select()
          .from(tasks)
          .where(
            and(
              eq(tasks.goalId, updatedTask.goalId),
              eq(tasks.userId, userId)
            )
          );

        const completedTasks = goalTasks.filter(t => t.completed).length;
        const progress = Math.round((completedTasks / goalTasks.length) * 100);

        await db.update(goals)
          .set({ progress })
          .where(and(
            eq(goals.id, updatedTask.goalId),
            eq(goals.userId, userId)
          ));
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("Failed to update task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:taskId", requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const taskIdInt = parseInt(taskId);
      const userId = req.user!.id;

      // First verify the task exists and belongs to the user
      const taskToDelete = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, taskIdInt),
          eq(tasks.userId, userId)
        )
      });

      if (!taskToDelete) {
        return res.status(404).json({ error: "Task not found or unauthorized" });
      }

      // First delete any time tracking records for this task
      await db.delete(timeTracking)
        .where(eq(timeTracking.taskId, taskIdInt));

      // Then delete all subtasks
      await db.delete(tasks)
        .where(eq(tasks.parentTaskId, taskIdInt));

      // Finally delete the main task
      const [deletedTask] = await db.delete(tasks)
        .where(and(
          eq(tasks.id, taskIdInt),
          eq(tasks.userId, userId)
        ))
        .returning();

      // Update goal progress
      const remainingTasks = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.goalId, taskToDelete.goalId),
          eq(tasks.userId, userId)
        ));

      if (remainingTasks.length > 0) {
        const completedTasks = remainingTasks.filter(t => t.completed).length;
        const progress = Math.round((completedTasks / remainingTasks.length) * 100);

        await db.update(goals)
          .set({ progress })
          .where(and(
            eq(goals.id, taskToDelete.goalId),
            eq(goals.userId, userId)
          ));
      } else {
        // If no tasks remain, set progress to 0
        await db.update(goals)
          .set({ progress: 0 })
          .where(and(
            eq(goals.id, taskToDelete.goalId),
            eq(goals.userId)
            ));
        }

        res.json({ success: true });
      } catch (error) {
        console.error("Failed to delete task:", error);
        res.status(500).json({
          error: "Failed to delete task",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    app.get("/api/forum/posts/:postId", requireAuth, async (req, res) => {
      try {
        const { postId } = req.params;
        const userId = req.user!.id;

        // Get the post with author details
        const post = await db.query.forumPosts.findFirst({
          where: eq(forumPosts.id, parseInt(postId)),
          with: {
            author: true,
          },
        });

        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }

        // Increment view count
        await db.update(forumPosts)
          .set({ viewCount: sql`${forumPosts.viewCount} + 1` })
          .where(eq(forumPosts.id, parseInt(postId)));

        // Get all comments for this post
        const comments = await db.select({
          id: forumComments.id,
          content: forumComments.content,
          parentCommentId: forumComments.parentCommentId,
          createdAt: forumComments.createdAt,
          author: {
            id: users.id,
            email: users.email,
            profilePhotoUrl: users.profilePhotoUrl,
          },
        })
          .from(forumComments)
          .where(eq(forumComments.postId, parseInt(postId)))
          .leftJoin(users, eq(forumComments.userId, users.id))
          .orderBy(forumComments.createdAt);

        // Build comment tree
        const commentMap = new Map();
        const rootComments: any[] = [];

        comments.forEach(comment => {
          comment.replies = [];
          commentMap.set(comment.id, comment);
        });

        comments.forEach(comment => {
          if (comment.parentCommentId) {
            const parentComment = commentMap.get(comment.parentCommentId);
            if (parentComment) {
              parentComment.replies.push(comment);
            }
          } else {
            rootComments.push(comment);
          }
        });

        // Return post with nested comments
        const response = {
          ...post,
          comments: rootComments,
        };

        res.json(response);
      } catch (error) {
        console.error("Failed to fetch forum post:", error);
        res.status(500).json({ error: "Failed to fetch forum post" });
      }
    });

    app.post("/api/forum/posts/:postId/comments", requireAuth, async (req, res) => {
      try {
        const { postId } = req.params;
        const { content, parentCommentId } = req.body;
        const userId = req.user!.id;

        // Verify the post exists and is not locked
        const post = await db.query.forumPosts.findFirst({
          where: eq(forumPosts.id, parseInt(postId))
        });

        if (!post) {
          return res.status(404).json({ error: "Post not found" });
        }

        if (post.isLocked) {
          return res.status(403).json({ error: "This post is locked" });
        }

        // If this is a reply, verify parent comment exists
        if (parentCommentId) {
          const parentComment = await db.query.forumComments.findFirst({
            where: and(
              eq(forumComments.id, parentCommentId),
              eq(forumComments.postId, parseInt(postId))
            )
          });

          if (!parentComment) {
            return res.status(404).json({ error: "Parent comment not found" });
          }
        }

        // Create the comment
        const [comment] = await db.insert(forumComments)
          .values({
            postId: parseInt(postId),
            userId,
            content,
            parentCommentId: parentCommentId || null,
          })
          .returning();

        // Get the complete comment data with author information
        const [commentWithAuthor] = await db.select({
          id: forumComments.id,
          content: forumComments.content,
          parentCommentId: forumComments.parentCommentId,
          createdAt: forumComments.createdAt,
          author: {
            id: users.id,
            email: users.email,
            profilePhotoUrl: users.profilePhotoUrl,
          },
        })
          .from(forumComments)
          .innerJoin(users, eq(forumComments.userId, users.id))
          .where(eq(forumComments.id, comment.id));

        res.json(commentWithAuthor);
      } catch (error) {
        console.error("Failed to create comment:", error);
        res.status(500).json({ error: "Failed to create comment" });
      }
    });

    const httpServer = createServer(app);
    return httpServer;
  }