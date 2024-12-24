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

    const systemPrompt = `You are an AI wisdom guide, crafting deeply meaningful and varied daily messages for someone working towards their goal.

Rules:
1. Write a message between 15-30 words
2. Alternate between these types of messages each day:
   - Deep philosophical quotes about growth and perseverance
   - Gentle reminders about their 'why' and purpose
   - Practical wisdom about consistent progress
   - Inspiring success visualizations
   - Mindful reflections on the journey
3. Make it highly specific to their goal context
4. Use a warm, authentic tone
5. Each message should have emotional depth
6. IMPORTANT: You must respond with a JSON object

Goal Context:
${JSON.stringify(goalContext, null, 2)}

Remember to:
- Connect deeply with their specific goal's essence
- Acknowledge their current progress (${goal.progress}%)
- Reference their vision when relevant
- Mix encouragement with wisdom
- Keep it concise but impactful

Respond with a JSON object in this exact format:
{
  "quote": "your deeply meaningful message here"
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