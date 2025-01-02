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

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are writing a heartfelt message to encourage and inspire. Create a personal, emotionally resonant message that feels like it's from a wise friend who deeply understands their journey.

Write a message with these characteristics:
- 2-3 short paragraphs (50-80 words total)
- Warm and personal tone
- Focus on emotions, growth, and inner strength
- Natural, conversational language
- ${messageStyle}

Context about their journey (use as inspiration but don't mention specifically):
${JSON.stringify(goalsContext, null, 2)}

You MUST format your response as a valid JSON object with ONLY this structure:
{
  "message": "Your message here with \n for line breaks"
}`
          }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", content);
        throw new Error("Invalid JSON response from OpenAI");
      }

      if (!parsedContent.message) {
        throw new Error("Message field missing in OpenAI response");
      }

      // Create a new message in the database
      await db.insert(futureMessages).values({
        userId,
        message: parsedContent.message,
        isRead: false,
      });

      return { message: parsedContent.message, isRead: false };
    } catch (openAiError) {
      console.error("OpenAI API error:", openAiError);
      throw new Error("Failed to generate message with OpenAI");
    }
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