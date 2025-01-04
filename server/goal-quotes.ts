import { db } from "@db";
import { goalDailyQuotes, goals } from "@db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import OpenAI from "openai";
import { startOfDay, endOfDay, format } from "date-fns";

if (!process.env.OPENAI_API_KEY_2) {
  throw new Error("OPENAI_API_KEY_2 is not set in environment variables");
}

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

    const date = format(new Date(), 'yyyy-MM-dd');

    // Get previous quotes for this goal to avoid repetition
    const previousQuotes = await db
      .select()
      .from(goalDailyQuotes)
      .where(and(
        eq(goalDailyQuotes.goalId, goalId),
        eq(goalDailyQuotes.userId, userId)
      ))
      .orderBy(desc(goalDailyQuotes.createdAt))
      .limit(5);

    const systemPrompt = `You are an AI quote curator, selecting relevant quotes for someone working on their personal goals.

Goal Context:
${JSON.stringify(goalContext, null, 2)}

Previous quotes to avoid repeating (DO NOT USE THESE):
${previousQuotes.map(q => q.quote).join('\n')}

Rules for selecting a quote:
1. Choose a quote that specifically relates to: "${goal.title}"
2. The quote must be different from the previous ones shown above
3. Select quotes from diverse sources: thought leaders, authors, scientists, philosophers
4. The quote should match the goal's current progress (${goal.progress}% complete)
5. Focus on motivation, wisdom, and practical insights
6. Ensure the quote has not been used recently for this goal

Respond with a JSON object in this format:
{
  "quote": "the quote text here",
  "author": "Author Name",
  "context": "Brief explanation of why this quote fits the goal"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt }
      ],
      temperature: 0.9, // Increased for more variety
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response generated");
    }

    const parsed = JSON.parse(content);

    // Create a new quote in the database with the date
    const [newQuote] = await db
      .insert(goalDailyQuotes)
      .values({
        userId,
        goalId,
        quote: `"${parsed.quote}" - ${parsed.author}`,
        isRead: false,
        createdAt: new Date(),
      })
      .returning();

    return newQuote;
  } catch (error) {
    console.error("Failed to generate daily quote:", error);
    throw error;
  }
}

export async function getTodayQuote(userId: number, goalId: number) {
  const today = startOfDay(new Date());

  // Check if there's a quote for today (using calendar date, not rolling 24 hours)
  const existingQuote = await db.query.goalDailyQuotes.findFirst({
    where: and(
      eq(goalDailyQuotes.userId, userId),
      eq(goalDailyQuotes.goalId, goalId),
      gte(goalDailyQuotes.createdAt, startOfDay(today)),
      lte(goalDailyQuotes.createdAt, endOfDay(today))
    ),
    orderBy: (quotes, { desc }) => [desc(quotes.createdAt)],
  });

  if (existingQuote) {
    return existingQuote;
  }

  // Generate a new quote if none exists for today
  return generateDailyQuote(userId, goalId);
}

export async function markQuoteAsRead(userId: number, goalId: number) {
  const today = new Date();

  // Find today's quote and mark it as read
  await db
    .update(goalDailyQuotes)
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