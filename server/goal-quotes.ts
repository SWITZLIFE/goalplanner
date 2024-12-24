import { db } from "@db";
import { goalDailyQuotes, goals } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import OpenAI from "openai";
import { startOfDay, endOfDay } from "date-fns";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export async function generateDailyQuote(userId: number, goalId: number) {
  try {
    // Get the goal details for context
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
      columns: {
        id: true,
        title: true,
        description: true,
        progress: true,
        totalTasks: true,
        visionStatement: true,
      },
    });

    if (!goal) {
      throw new Error("Goal not found");
    }

    const goalContext = {
      title: goal.title,
      description: goal.description,
      progress: goal.progress,
      totalTasks: goal.totalTasks,
      visionStatement: goal.visionStatement,
    };

    const systemPrompt = `You are an AI motivational coach, creating a powerful and inspiring daily quote specific to the user's goal.
Rules:
1. Write a quote between 15-30 words
2. Make it specific to their goal and current progress
3. Be encouraging and action-oriented
4. Use an inspiring, energetic tone
5. IMPORTANT: You must respond with a JSON object

Goal Context:
${JSON.stringify(goalContext, null, 2)}

Write like you're a mentor providing a focused, goal-specific piece of motivation.

Respond with a JSON object in this exact format:
{
  "quote": "your motivational quote here"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response generated");
    }

    const parsed = JSON.parse(content);
    
    // Create a new quote in the database
    await db.insert(goalDailyQuotes).values({
      userId,
      goalId,
      quote: parsed.quote,
      isRead: false,
    });

    return parsed.quote;
  } catch (error) {
    console.error("Failed to generate daily quote:", error);
    throw error;
  }
}

export async function getTodayQuote(userId: number, goalId: number) {
  const today = new Date();
  
  // Check if there's already a quote for today
  const existingQuote = await db.query.goalDailyQuotes.findFirst({
    where: and(
      eq(goalDailyQuotes.userId, userId),
      eq(goalDailyQuotes.goalId, goalId),
      gte(goalDailyQuotes.createdAt, startOfDay(today)),
      lte(goalDailyQuotes.createdAt, endOfDay(today))
    ),
  });

  if (existingQuote) {
    return existingQuote;
  }

  // Generate a new quote if none exists
  const quote = await generateDailyQuote(userId, goalId);
  return {
    quote,
    isRead: false,
  };
}

export async function markQuoteAsRead(userId: number, goalId: number) {
  const today = new Date();
  
  // Find today's quote and mark it as read
  await db.update(goalDailyQuotes)
    .set({ isRead: true })
    .where(
      and(
        eq(goalDailyQuotes.userId, userId),
        eq(goalDailyQuotes.goalId, goalId),
        gte(goalDailyQuotes.createdAt, startOfDay(today)),
        lte(goalDailyQuotes.createdAt, endOfDay(today))
      )
    );
}
