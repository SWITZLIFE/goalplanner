import { db } from "@db";
import { futureMessages, goals, tasks } from "@db/schema";
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

    const systemPrompt = `You are the user's future successful self, writing a brief but powerful message back in time to motivate them.
Rules:
1. Keep the message under 30 words
2. Be specific about their current goals
3. Focus on progress and potential
4. Use an encouraging, optimistic tone
5. Make it personal based on their goals
6. IMPORTANT: You must respond with a JSON object

Current Goals Context:
${JSON.stringify(goalsContext, null, 2)}

Respond with a JSON object in this exact format:
{
  "message": "your motivational message here"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using gpt-3.5-turbo for better reliability and cost-effectiveness
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

    return parsed.message;
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
  return existingMessage || {
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
}
