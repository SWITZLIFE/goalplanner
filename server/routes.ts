import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { and, eq } from "drizzle-orm";
import { getFile, storeFile, deleteFile } from "./storage";
import { setupAuth, requireAuth } from "./auth";
import multer from "multer";
import { goals, tasks, timeTracking, users, visionBoardImages } from "@db/schema";
import { getCoachingAdvice } from "./coaching";
import { sql } from "drizzle-orm";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

export function registerRoutes(app: Express): Server {
  // Set up authentication
  setupAuth(app);

  // Create endpoint to serve vision board images securely
  app.get('/api/vision-board/images/:key', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const key = decodeURIComponent(req.params.key);

      console.log('Attempting to serve image:', { userId, key });

      // First verify this image belongs to the user
      const [image] = await db.select()
        .from(visionBoardImages)
        .where(and(
          eq(visionBoardImages.userId, userId),
          eq(visionBoardImages.imageKey, key)
        ))
        .limit(1);

      if (!image) {
        console.log('Image not found in database:', { userId, key });
        return res.status(404).json({ error: "Image not found" });
      }

      console.log('Found image in database:', image);

      const file = await getFile(key);
      if (!file) {
        console.log('Image not found in storage:', { userId, key });
        return res.status(404).json({ error: "Image not found in storage" });
      }

      console.log('Successfully retrieved image from storage:', { userId, key, size: file.length });

      // Determine content type based on file extension
      const ext = key.split('.').pop()?.toLowerCase();
      const contentType = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif'
      }[ext || ''] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.send(file);
    } catch (error) {
      console.error("Error serving image:", error);
      res.status(500).json({ error: "Failed to serve image" });
    }
  });

  // Vision Board API
  app.get("/api/vision-board", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
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

  app.post("/api/vision-board/upload", requireAuth, upload.single('image'), async (req, res) => {
    try {
      console.log('Processing image upload request:', req.file);
      const userId = req.user!.id;

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

      // Store file in Replit storage
      const imageKey = await storeFile(userId, req.file);
      console.log('Stored image with key:', imageKey);

      const [newImage] = await db.insert(visionBoardImages)
        .values({
          userId,
          imageKey,
          position: nextPosition,
        })
        .returning();

      res.json(newImage);
    } catch (error) {
      console.error("Failed to upload image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  app.delete("/api/vision-board/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const imageId = parseInt(req.params.id);

      const [image] = await db.select()
        .from(visionBoardImages)
        .where(
          and(
            eq(visionBoardImages.id, imageId),
            eq(visionBoardImages.userId, userId)
          )
        )
        .limit(1);

      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }

      // Delete the file from storage first
      await deleteFile(image.imageKey);

      // Then delete the database record
      await db.delete(visionBoardImages)
        .where(
          and(
            eq(visionBoardImages.id, imageId),
            eq(visionBoardImages.userId, userId)
          )
        );

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete image:", error);
      res.status(500).json({ error: "Failed to delete image" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}