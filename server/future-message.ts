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

    const goalsContext = await Promise.all(userGoals.map(async goal => ({
      title: goal.title,
      progress: goal.progress,
      totalTasks: goal.totalTasks,
      tasks: goal.tasks.map(task => ({
        title: task.title,
        completed: task.completed,
        dueDate: task.dueDate,
      }))
    })));

    const systemPrompt = `You are the user's future successful self, writing a heartfelt message back in time. Choose randomly between these message styles:

1. A vivid visualization of successfully completing one of their aspirations (without naming specific goals)
2. A reflection on personal growth and lessons learned along the journey
3. A reminder of their inner strength and resilience
4. A celebration of small wins and progress
5. A gentle encouragement during challenging times
6. A perspective shift on obstacles they might be facing

Guidelines:
- Write 40-60 words
- Use warm, personal "I/you" language
- Focus on emotions and growth rather than specific tasks
- Vary the tone between inspirational, reflective, and supportive
- Add natural line breaks
- IMPORTANT: You must respond with a JSON object

Current Context:
Goals and Tasks:
${JSON.stringify(goalsContext, null, 2)}

Consider both goals and their associated tasks when crafting the message, but keep the message general and encouraging rather than listing specific tasks.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
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