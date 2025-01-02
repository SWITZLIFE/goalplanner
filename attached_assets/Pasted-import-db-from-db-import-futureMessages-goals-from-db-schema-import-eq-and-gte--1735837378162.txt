import { db } from "@db";
import { futureMessages, goals } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import OpenAI from "openai";
import { startOfDay, endOfDay } from "date-fns";
import { z } from "zod";

if (!process.env.OPENAI_API_KEY_2) {
  throw new Error("OPENAI_API_KEY_2 is not set in environment variables");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
  timeout: 30000, // 30 second timeout
  maxRetries: 3,
});

// Schema for validating OpenAI response
const messageResponseSchema = z.object({
  message: z.string().min(1),
});

export async function generateDailyMessage(userId: number) {
  try {
    // Get all goals and their progress for the user
    const userGoals = await db.query.goals.findMany({
      where: eq(goals.userId, userId),
      columns: {
        id: true,
        title: true,
        progress: true,
        totalTasks: true,
      },
      with: {
        tasks: true,
      },
    });

    const goalsContext = userGoals.map(goal => ({
      title: goal.title,
      progress: goal.progress,
      totalTasks: goal.totalTasks,
    }));

    // Simple validation to ensure we have goals to work with
    if (goalsContext.length === 0) {
      return { message: "No goals found to generate a message.", isRead: false };
    }

    // Debug log before making API request
    console.log("OpenAI Configuration:", {
      apiKey: `${process.env.OPENAI_API_KEY_2?.slice(0, 5)}...`,
      timeout: 30000,
      maxRetries: 3
    });

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Generate a motivational message about these goals: ${JSON.stringify(goalsContext, null, 2)}. The message should be 40-60 words, encouraging, and reference specific goals. Format your entire response as a JSON object with a 'message' field containing the motivational text.`
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    console.log("OpenAI API Response:", {
      status: "success",
      choices: response.choices?.length ?? 0
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Log the raw response for debugging
    console.log("Raw OpenAI response content:", content);

    try {
      const parsedContent = JSON.parse(content);
      const validatedContent = messageResponseSchema.parse(parsedContent);

      // Create a new message in the database
      await db.insert(futureMessages).values({
        userId,
        message: validatedContent.message,
        isRead: false,
      });

      return { message: validatedContent.message, isRead: false };
    } catch (parseError) {
      console.error("JSON Parsing Error:", {
        error: parseError.message,
        content: content.slice(0, 200),
        contentType: typeof content
      });
      throw parseError;
    }
  } catch (error) {
    if (error.response) {
      console.error("OpenAI API Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    console.error("Failed to generate daily message:", error);
    throw error;
  }
}

export async function getTodayMessage(userId: number) {
  const today = new Date();

  // Check if there's already a message for today
  const existingMessage = await db.query.futureMessages.findFirst({
    where: and(
      eq(futureMessages.userId, userId),
      gte(futureMessages.createdAt, startOfDay(today)),
      lte(futureMessages.createdAt, endOfDay(today))
    ),
  });

  return existingMessage ? {
    message: existingMessage.message,
    isRead: existingMessage.isRead,
  } : {
    message: null,
    isRead: false,
  };
}

export async function markMessageAsRead(userId: number) {
  const today = new Date();

  // Find today's message and mark it as read
  await db.update(futureMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(futureMessages.userId, userId),
        gte(futureMessages.createdAt, startOfDay(today)),
        lte(futureMessages.createdAt, endOfDay(today))
      )
    );

  return { success: true };
}