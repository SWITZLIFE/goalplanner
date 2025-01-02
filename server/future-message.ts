import { db } from "@db";
import { futureMessages, goals } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import OpenAI from "openai";
import { startOfDay, endOfDay } from "date-fns";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
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

    const systemPrompt = `You are the user's future successful self, writing a heartfelt message back in time to motivate them.
Rules:
1. Write a message between 40-60 words
2. Be specific about their current goals and aspirations
3. Share insights about the journey and growth ahead
4. Use an encouraging, warm, and optimistic tone
5. Make it personal based on their goals
6. Add line breaks between paragraphs
7. IMPORTANT: You must respond with a JSON object

Current Goals Context:
${JSON.stringify(goalsContext, null, 2)}

Write like you're having a warm conversation with a friend who needs encouragement. Share specific details about their goals and the amazing progress they'll make.

Respond with a JSON object in this exact format:
{
  "message": "your motivational message here"
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

    // Create a new message in the database
    await db.insert(futureMessages).values({
      userId,
      message: parsed.message,
      isRead: false,
    });

    return { message: parsed.message, isRead: false };
  } catch (error) {
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

  // Only return the existing message if it exists, don't generate a new one
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