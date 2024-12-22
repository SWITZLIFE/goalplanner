import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, rewards, rewardItems, purchasedRewards, visionBoardImages } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "./middleware";
import { uploadFileToSupabase } from "./supabase";
import multer from "multer";

const upload = multer({ dest: "uploads/" });

export function registerRoutes(app: Express): Server {
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
      console.log('Processing image upload request');
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

      // Upload file to Supabase Storage
      const imageUrl = await uploadFileToSupabase(req.file);
      console.log('Supabase Image URL:', imageUrl);

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
      res.status(500).json({ 
        error: "Failed to upload image",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.delete("/api/vision-board/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
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
      res.status(500).json({ error: "Failed to fetch purchased rewards" });
    }
  });

  app.post("/api/rewards/purchase/:itemId", requireAuth, async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const userId = req.user!.id;

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

  // Reward Activation API
  app.post("/api/rewards/activate/:purchaseId", requireAuth, async (req, res) => {
    try {
      const { purchaseId } = req.params;
      const userId = req.user!.id;

      // Get the purchase and verify ownership
      const purchase = await db.query.purchasedRewards.findFirst({
        where: and(
          eq(purchasedRewards.id, parseInt(purchaseId)),
          eq(purchasedRewards.userId, userId)
        ),
        with: {
          rewardItem: true,
        },
      });

      if (!purchase) {
        return res.status(404).json({ error: "Reward purchase not found or unauthorized" });
      }

      if (purchase.activated) {
        return res.status(400).json({ error: "Reward has already been activated" });
      }

      // Get user information for webhook
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          email: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update the purchase record
      const [updatedPurchase] = await db.update(purchasedRewards)
        .set({
          activated: true,
          activatedAt: new Date(),
          webhookSent: true,
        })
        .where(and(
          eq(purchasedRewards.id, parseInt(purchaseId)),
          eq(purchasedRewards.userId, userId)
        ))
        .returning();

      // Send webhook
      const webhookUrl = process.env.REWARD_WEBHOOK_URL;
      if (webhookUrl) {
        try {
          const rewardItem = purchase.rewardItem as { name: string; type: string; } | undefined;
          const webhookData = {
            purchaseId: purchase.id,
            rewardName: rewardItem?.name ?? 'Unknown Reward',
            rewardType: rewardItem?.type ?? 'unknown',
            purchaseDate: purchase.purchasedAt,
            activationDate: updatedPurchase.activatedAt,
            userEmail: user.email,
          };

          await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData),
          });
        } catch (webhookError) {
          console.error('Failed to send webhook:', webhookError);
          // Don't fail the request if webhook fails
        }
      }

      res.json(updatedPurchase);
    } catch (error) {
      console.error("Failed to activate reward:", error);
      res.status(500).json({ error: "Failed to activate reward" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}