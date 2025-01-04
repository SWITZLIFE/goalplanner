import { db } from "@db";
import { goalDailyQuotes, goals } from "@db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import OpenAI from "openai";
import { startOfDay, endOfDay, format } from "date-fns";
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
const quoteResponseSchema = z.object({
  quote: z.string().min(1),
  author: z.string().min(1),
  context: z.string().optional(),
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

Format your response exactly like this example:
{
  "quote": "The only way to do great work is to love what you do.",
  "author": "Steve Jobs",
  "context": "This quote resonates with the goal of career development"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt }
      ],
      temperature: 0.9, // Increased for more variety
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    // Log the raw response for debugging
    console.log("Raw OpenAI response content:", content);

    try {
      // Handle potential non-JSON responses
      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        // If content is not valid JSON, try to extract message directly
        console.warn("Invalid JSON response, attempting to parse as raw message");
        parsedContent = { message: content.replace(/^"|"$/g, '').trim() };
      }

      const validatedContent = quoteResponseSchema.parse(parsedContent);

      // Create a new message in the database
      const [newQuote] = await db
        .insert(goalDailyQuotes)
        .values({
          userId,
          goalId,
          quote: `"${validatedContent.quote}" - ${validatedContent.author}`,
          isRead: false,
          createdAt: new Date(),
        })
        .returning();

      return { quote: newQuote.quote, isRead: false };
    } catch (error) {
      console.error("Message Processing Error:", {
        error: error.message,
        content: content?.slice(0, 200),
        contentType: typeof content
      });
      throw new Error("Failed to process the generated message");
    }
  } catch (error) {
    if (error.response) {
      console.error("OpenAI API Error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    console.error("Failed to generate daily quote:", error);
    throw new Error("Failed to generate quote");
  }
}

export async function getTodayQuote(userId: number, goalId: number) {
  try {
    const today = startOfDay(new Date());

    // Check if there's already a message for today
    const existingQuote = await db.query.goalDailyQuotes.findFirst({
      where: and(
        eq(goalDailyQuotes.userId, userId),
        eq(goalDailyQuotes.goalId, goalId),
        gte(goalDailyQuotes.createdAt, startOfDay(today)),
        lte(goalDailyQuotes.createdAt, endOfDay(today))
      ),
    });

    if (existingQuote) {
      return {
        quote: existingQuote.quote,
        isRead: existingQuote.isRead,
      };
    }

    // Generate a new quote if none exists for today
    return generateDailyQuote(userId, goalId);
  } catch (error) {
    console.error("Failed to fetch daily quote:", error);
    throw new Error("Failed to fetch daily quote");
  }
}

export async function markQuoteAsRead(userId: number, goalId: number) {
  try {
    const today = new Date();

    // Find today's message and mark it as read
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

    return { success: true };
  } catch (error) {
    console.error("Error marking quote as read:", error);
    throw new Error("Failed to mark quote as read");
  }
}