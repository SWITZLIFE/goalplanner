import type { Express, Request, Response, NextFunction } from "express";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { notes, users, rewards, rewardItems, purchasedRewards } from "@db/schema";
import { getTodayMessage, markMessageAsRead, generateDailyMessage } from "./future-message";
import { createServer, type Server } from "http";
import { db } from "@db";
import { goals, tasks, timeTracking, visionBoardImages } from "@db/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { generateTaskBreakdown, generateShortTitle } from "./openai";
import { getCoachingAdvice } from "./coaching";
import { setupAuth } from "./auth";
import { openai } from "./openai";
import { uploadFileToSupabase } from './supabase';
import { getTodayQuote, markQuoteAsRead } from "./goal-quotes";
import { registerGoogleOAuthRoutes } from "./google-oauth";
import { coinHistory } from "@db/schema"; // Import coinHistory schema
import { supabase } from './supabase'; // Import supabase client


// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
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
            eq(goals.userId, userId)
          ));
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
  app.post("/api/goals/:goalId/vision", requireAuth, async (req, res) => {
    try {
      const { goalId } = req.params;
      const { answers } = req.body;
      const userId = req.user!.id;

      // Get the goal details first and verify ownership
      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, parseInt(goalId)),
          eq(goals.userId, userId)
        ),
      });

      if (!goal) {
        return res.status(404).json({ error: "Goal not found or unauthorized" });
      }

      // Generate vision statement using OpenAI
      const prompt = `Write a heartfelt letter from my present self to my future self about my goal: "${goal.title}". This letter should remind me of my core motivations and serve as a powerful reminder of why I started this journey. Use these reflections to craft the message:
My reflections:
${answers.map((answer: string, index: number) => `${index + 1}. ${answer}`).join('\n')}

Write the letter like this:
1. Start with "Dear future me," (on its own line)
2. Begin with why this goal deeply matters to me and what inspired me to start
3. Include specific details about:
   - The meaningful impact this will have on my life
   - The growth and learning I'll experience along the way
   - The positive changes I'll see as I make progress
4. End with a powerful reminder of my inner strength and capability
5. Sign it with "From, [current date] me"

Keep it personal and authentic, using "I" and "my" throughout. Make it something I can read whenever I need to reconnect with my purpose.

Write the letter like this:
1. Start with "Dear friend," or something warm like that (on its own line)
2. Add a short opening paragraph sharing how proud you are to see yourself taking on this goal
3. Write 2-3 paragraphs from the heart about:
   - The amazing journey you're on and why it matters so much to you
   - How you're growing and what you're learning about yourself
   - The wonderful changes you'll see as you make progress
4. End with a warm, encouraging closing (on its own line)
5. Sign it with something like "With love and belief in you," (on its own line)

Make it feel like:
- A warm hug in letter form (100-200 words)
- Like chatting with a close friend who really believes in you
- Something you'd read when you need a boost of motivation
- Super personal, using "I" and "my" throughout

Remember to:
- Add line breaks between paragraphs (this is important!)
- Keep the tone super friendly and caring
- Share specific little details from your reflections
- Make it feel like a cozy conversation, not a formal letter`;

      const openaiResponse = await openai.chat.completions.create({
        model: "gpt-4",
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

      if (!visionStatement) {
        throw new Error("Failed to generate vision statement from OpenAI");
      }

      console.log('Generated vision statement:', visionStatement);

      try {
        // Validate vision statement before saving
        if (!visionStatement || visionStatement.trim().length === 0) {
          throw new Error("Generated vision statement is empty");
        }

        // Update the goal with the new vision statement
        const [updatedGoal] = await db.update(goals)
          .set({
            visionStatement: visionStatement,
            visionResponses: JSON.stringify(answers)
          })
          .where(and(
            eq(goals.id, parseInt(goalId)),
            eq(goals.userId, userId)
          ))
          .returning();

        if (!updatedGoal) {
          throw new Error("Failed to update goal with vision statement");
        }

        // Verify the update was successful
        const verifiedGoal = await db.query.goals.findFirst({
          where: and(
            eq(goals.id, parseInt(goalId)),
            eq(goals.userId, userId)
          )
        });

        if (!verifiedGoal || verifiedGoal.visionStatement !== visionStatement) {
          throw new Error("Vision statement verification failed");
        }

        // Return both the vision statement and the updated goal
        res.json({
          visionStatement,
          goal: verifiedGoal
        });
      } catch (dbError) {
        console.error("Failed to update goal in database:", dbError);
        res.status(500).json({
          error: "Failed to save vision statement",
          details: dbError instanceof Error ? dbError.message : "Unknown database error"
        });
      }
    } catch (error) {
      console.error("Failed to generate vision statement:", error);
      res.status(500).json({
        error: "Failed to generate vision statement",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // AI Coaching API
  app.get("/api/goals/:goalId/coaching", requireAuth, async (req, res) => {
    res.json({
      message: "Hey! I'm your AI coach. Let me know if you need help with anything!",
      type: "welcome"
    });
  });

  app.post("/api/goals/:goalId/coaching/chat", requireAuth, async (req, res) => {
    try{
      const { goalId } = req.params;
      const { message } = req.body;
      const userId = req.user!.id;

      const goal = await db.query.goals.findFirst({
        where: and(
          eq(goals.id, parseInt(goalId)),
          eq(goals.userId, userId)
        ),
        with: {
          tasks: true,
        },
      });

      if (!goal) {
        return res.status(404).json({ error: "Goal not found or unauthorized" });
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

  // Daily Goal Quote API
  app.get("/api/goals/:goalId/quote", requireAuth, async (req, res) => {
    try {
      const { goalId } = req.params;
      const userId = req.user!.id;

      const quote = await getTodayQuote(userId, parseInt(goalId));
      res.json(quote);
    } catch (error) {
      console.error("Failed to fetch daily quote:", error);
      res.status(500).json({ error: "Failed to fetch daily quote" });
    }
  });

  app.post("/api/goals/:goalId/quote/read", requireAuth, async (req, res) => {
    try {
      const { goalId } = req.params;
      const userId = req.user!.id;

      await markQuoteAsRead(userId, parseInt(goalId));
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark quote as read:", error);
      res.status(500).json({ error: "Failed to mark quote as read" });
    }
  });


  // Coin History API
  app.get("/api/rewards/history", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const history = await db.select({
        amount: coinHistory.amount,
        balance: coinHistory.balance,
        timestamp: coinHistory.timestamp,
        reason: coinHistory.reason
      })
        .from(coinHistory)
        .where(eq(coinHistory.userId, userId))
        .orderBy(coinHistory.timestamp);

      res.json(history);
    } catch (error) {
      console.error("Failed to fetch coin history:", error);
      res.status(500).json({ error: "Failed to fetch coin history" });
    }
  });

  // Timer Current Status API
  app.get("/api/timer/current", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      const activeTimer = await db.query.timeTracking.findFirst({
        where: and(
          eq(timeTracking.userId, userId),
          eq(timeTracking.isActive, true)
        ),
      });

      res.json(activeTimer || null);
    } catch (error) {
      console.error("Failed to get current timer:", error);
      res.status(500).json({ error: "Failed to get current timer status" });
    }
  });

  // Time Tracking API
  app.post("/api/tasks/:taskId/timer/start", requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.id;

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

  app.post("/api/tasks/:taskId/timer/stop", requireAuth, async (req, res) => {
    try {
      const { taskId } = req.params;
      const userId = req.user!.id;

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

      // Update task's total time
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

      let currentBalance = 0;
      if (!userRewards) {
        // Create initial rewards record if it doesn't exist
        const [newRewards] = await db.insert(rewards)
          .values({
            userId,
            coins: coinsEarned,
            lastUpdated: new Date(),
          })
          .returning();
        currentBalance = coinsEarned;
      } else {
        // Update existing rewards
        const [updatedRewards] = await db.update(rewards)
          .set({
            coins: sql`${rewards.coins} + ${coinsEarned}`,
            lastUpdated: new Date(),
          })
          .where(eq(rewards.userId, userId))
          .returning();
        currentBalance = updatedRewards.coins;
      }

      // Record coin history
      await db.insert(coinHistory)
        .values({
          userId,
          amount: coinsEarned,
          balance: currentBalance,
          reason: `Earned from working ${minutesWorked} minutes on task`,
          timestamp: new Date(),
        });

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

  // Rewards API
  app.get("/api/rewards", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const [userRewards] = await db.select()
        .from(rewards)
        .where(eq(rewards.userId, userId))
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
  app.get("/api/rewards/purchased", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

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

  app.post("/api/rewards/purchase/:itemId", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const userId = req.user!.id;

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

  // Add new endpoint for leaderboard
  app.get("/api/rewards/leaderboard", requireAuth, async (req, res) => {
    try {
      // Get top 10 users by coin balance
      const leaderboard = await db.select({
        id: users.id,
        email: users.email,
        coins: rewards.coins,
        lastUpdated: rewards.lastUpdated,
      })
      .from(rewards)
      .innerJoin(users, eq(rewards.userId, users.id))
      .orderBy(desc(rewards.coins))
      .limit(10);

      // Map the response to use email as username
      const mappedLeaderboard = leaderboard.map(entry => ({
        id: entry.id,
        username: entry.email.split('@')[0], // Show only the part before @ for privacy
        coins: entry.coins,
        lastUpdated: entry.lastUpdated,
      }));

      res.json(mappedLeaderboard);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}