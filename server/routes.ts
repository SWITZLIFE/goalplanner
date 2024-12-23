import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { eq, desc, and } from "drizzle-orm";
import { goals, users } from "@db/schema";
import { generateMotivationalQuote } from "./openai";

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "You must be logged in to access this resource" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  // Goals API
  app.get("/api/goals", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      // First verify the user exists
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get all goals for this user
      const userGoals = await db.select({
        id: goals.id,
        title: goals.title,
        description: goals.description,
        targetDate: goals.targetDate,
        progress: goals.progress,
        totalTasks: goals.totalTasks,
        createdAt: goals.createdAt,
        userId: goals.userId,
      })
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));

      res.json(userGoals);
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

  const httpServer = createServer(app);
  return httpServer;
}