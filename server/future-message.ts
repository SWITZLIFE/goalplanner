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
    // Get all goals for context but we won't specifically mention them
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

    // Generate a random number to determine the type of message
    const messageType = Math.random();

    // Create a dynamic prompt based on the random message type
    let messageStyle;
    if (messageType < 0.25) {
      messageStyle = "Write a visualization message, painting a vivid picture of a moment of achievement and growth. Focus on the feelings, the environment, and the inner satisfaction of progress.";
    } else if (messageType < 0.5) {
      messageStyle = "Write a reflective message that helps them understand their journey better. Share wisdom about personal growth, learning from challenges, and the beauty of the process.";
    } else if (messageType < 0.75) {
      messageStyle = "Write an energizing motivational message that ignites their drive. Focus on their inner strength, potential, and the exciting possibilities ahead.";
    } else {
      messageStyle = "Write a gentle, supportive message that acknowledges their efforts and reminds them of their resilience. Share insights about self-compassion and steady progress.";
    }

    const systemPrompt = `You are writing a heartfelt message to encourage and inspire. Create a personal, emotionally resonant message that feels like it's from a wise friend who deeply understands their journey.

Rules:
1. Write 2-3 short paragraphs (50-80 words total)
2. Make it feel warm and personal, like a friend reaching out at just the right moment
3. Focus on emotions, growth, and inner strength
4. Use natural, conversational language
5. Add line breaks between paragraphs
6. ${messageStyle}
7. IMPORTANT: Respond with a JSON object

Use this context to understand their journey (but don't explicitly mention these goals):
${JSON.stringify(goalsContext, null, 2)}

Remember to:
- Vary sentence structure and length for natural flow
- Include sensory details and emotions
- Focus on the journey and growth, not just outcomes
- Make it feel like a personal conversation
- Keep it concise but impactful

Respond with a JSON object in this exact format:
{
  "message": "your message here"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt }
      ],
      temperature: 0.8,
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