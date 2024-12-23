import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { eq, desc, and } from "drizzle-orm";
import { goals, tasks, timeTracking, visionBoardImages, notes, users } from "@db/schema";
import multer from "multer";
import { generateTaskBreakdown, generateShortTitle, generateMotivationalQuote } from "./openai";
import { getCoachingAdvice } from "./coaching";
import { setupAuth } from "./auth";
import { uploadFileToSupabase } from './supabase';
import { getTodayMessage, markMessageAsRead, generateDailyMessage } from "./future-message";

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

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "You must be logged in to access this resource" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  // Setup authentication middleware and routes first
  setupAuth(app);

  // Configure CORS headers for Supabase Storage URLs
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.SUPABASE_URL);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
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

    next();
  });

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

  // Goals API
  app.get("/api/goals", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
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
        userId: goals.userId,
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

  // Quote Generation API
  app.get("/api/goals/:goalId/quote", requireAuth, async (req, res) => {
    try {
      const { goalId } = req.params;
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

      // Generate quote using the goal's description as context
      const quote = await generateMotivationalQuote(goal.description || goal.title);

      res.json({ quote });
    } catch (error) {
      console.error("Failed to generate quote:", error);
      res.status(500).json({ error: "Failed to generate quote" });
    }
  });

  // Future Message API
  app.get("/api/future-message/today", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const message = await getTodayMessage(userId);
      res.json(message);
    } catch (error) {
      console.error("Failed to get future message:", error);
      res.status(500).json({ error: "Failed to get future message" });
    }
  });

  // Notes API
  app.get("/api/notes", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      const userNotes = await db.select()
        .from(notes)
        .where(eq(notes.userId, userId))
        .orderBy(desc(notes.updatedAt));

      res.json(userNotes);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.post("/api/future-message/generate", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const message = await generateDailyMessage(userId);
      res.json({ message, isRead: false });
    } catch (error) {
      console.error("Failed to generate future message:", error);
      res.status(500).json({ error: "Failed to generate future message" });
    }
  });

  app.post("/api/future-message/read", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      await markMessageAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark message as read:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}