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

    const systemPrompt = `You are an AI quote curator, selecting relevant quotes from famous authors and personalities that relate to the user's goal.
Rules:
1. Select a quote from a famous author/personality that relates to the goal's topic and current progress
2. The quote should be inspiring and relevant to their situation
3. Choose authors known for wisdom in the goal's domain (e.g., business leaders for career goals)
4. Include the author's name
5. IMPORTANT: You must respond with a JSON object

Goal Context:
${JSON.stringify(goalContext, null, 2)}

Select a quote that will resonate with their journey and provide wisdom from someone who achieved similar goals.

Respond with a JSON object in this exact format:
{
  "quote": "the famous quote here",
  "author": "Author Name"
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
      quote: `"${parsed.quote}" - ${parsed.author}`,
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
