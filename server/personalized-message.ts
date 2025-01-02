import { db } from "@db";
import { personalizedMessages, goals } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import OpenAI from "openai";
import { startOfDay, endOfDay } from "date-fns";
import { z } from "zod";

if (!process.env.OPENAI_API_KEY_2) {
  throw new Error("OPENAI_API_KEY_2 is not set in environment variables");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
  timeout: 30000,
  maxRetries: 3,
});

// Schema for validating OpenAI response
const messageResponseSchema = z.object({
  message: z.string().min(1),
  messageType: z.enum(["motivation", "reflection", "visualization"]),
});

export async function generatePersonalizedMessage(userId: number) {
  try {
    // Get high-level context about user's goals
    const userGoals = await db.query.goals.findMany({
      where: eq(goals.userId, userId),
      columns: {
        title: true,
        visionStatement: true,
      },
    });

    if (userGoals.length === 0) {
      return {
        message: "Start by setting your first goal, and I'll be here to support your journey.",
        messageType: "motivation",
        isRead: false,
      };
    }

    // Randomly select message type
    const messageTypes = ['motivation', 'reflection', 'visualization'] as const;
    const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];

    let prompt = '';
    switch (messageType) {
      case 'motivation':
        prompt = `Write a short, personal motivational message (50-70 words) as if from my future self who has achieved great things. Focus on inner strength and potential. Keep it warm and encouraging.`;
        break;
      case 'reflection':
        prompt = `Write a brief, thoughtful reflection (50-70 words) as if from my future self looking back on the journey of growth and change. Focus on the learning experiences and personal insights gained.`;
        break;
      case 'visualization':
        prompt = `Create a vivid snapshot (50-70 words) from my successful future self, describing a moment of achievement and fulfillment. Paint a picture of the positive energy and satisfaction being experienced.`;
        break;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are writing a personalized message from the future self to the current self. The message should be heartfelt and personal, written in first person. Don't mention specific goals, but draw inspiration from their overall direction.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 150,
    });

    const generatedMessage = response.choices[0].message.content?.trim();

    if (!generatedMessage) {
      throw new Error("Empty response from OpenAI");
    }

    // Create a new message in the database
    const [newMessage] = await db.insert(personalizedMessages)
      .values({
        userId,
        message: generatedMessage,
        messageType,
        isRead: false,
      })
      .returning();

    return {
      message: generatedMessage,
      messageType,
      isRead: false
    };
  } catch (error: any) {
    console.error("Failed to generate personalized message:", error);
    throw error;
  }
}

export async function getTodayMessage(userId: number) {
  const today = new Date();

  const existingMessage = await db.query.personalizedMessages.findFirst({
    where: and(
      eq(personalizedMessages.userId, userId),
      gte(personalizedMessages.createdAt, startOfDay(today)),
      lte(personalizedMessages.createdAt, endOfDay(today))
    ),
  });

  return existingMessage ? {
    message: existingMessage.message,
    messageType: existingMessage.messageType,
    isRead: existingMessage.isRead,
  } : {
    message: null,
    messageType: null,
    isRead: false,
  };
}

export async function markMessageAsRead(userId: number) {
  const today = new Date();

  await db.update(personalizedMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(personalizedMessages.userId, userId),
        gte(personalizedMessages.createdAt, startOfDay(today)),
        lte(personalizedMessages.createdAt, endOfDay(today))
      )
    );

  return { success: true };
}