import OpenAI from "openai";
import type { PersonalizedMessage, NewPersonalizedMessage } from "@db/schema";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export async function generateTaskBreakdown(goalTitle: string, numTasks: number): Promise<{ title: string; subtasks: string[] }[]> {
  const prompt = `Break down the following goal into ${numTasks} actionable tasks with subtasks:
Goal: "${goalTitle}"

Please provide a JSON array where each task has a title and exactly 3 subtasks with time estimates. Format:
{
  "tasks": [
    {
      "title": "Main task 1",
      "subtasks": [
        { "title": "Subtask 1", "estimatedMinutes": 30 },
        { "title": "Subtask 2", "estimatedMinutes": 45 },
        { "title": "Subtask 3", "estimatedMinutes": 60 }
      ]
    }
  ]
}

Requirements:
1. Generate EXACTLY ${numTasks} main tasks (no more, no less)
2. Each main task MUST have EXACTLY 3 subtasks
3. Each subtask MUST have an estimatedMinutes field with a realistic time estimate
4. Tasks and subtasks should be specific, actionable, and measurable
5. Time estimates should be realistic and based on task complexity
6. CRITICAL: List tasks in chronological order - first task should be the first step to take, last task should be the final step
7. Tasks MUST follow a logical sequence where each task builds upon previous tasks

Example order for a software project:
- First tasks: Development and core features
- Middle tasks: Testing, deployment, marketing
- Last tasks: User acquisition, monetization, scaling

Remember: The response MUST contain exactly ${numTasks} main tasks in chronological order.`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a goal breakdown assistant that helps users break down their goals into actionable tasks and subtasks.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("Failed to generate task breakdown");
  }

  try {
    const parsed = JSON.parse(content);
    return parsed.tasks || [];
  } catch (error) {
    console.error("Failed to parse OpenAI response:", error);
    throw new Error("Failed to parse task breakdown");
  }
}

export async function generateShortTitle(longTitle: string): Promise<string> {
  const prompt = `Create a shorter, more concise title for the following goal while preserving its core meaning:
"${longTitle}"

Requirements:
1. Maximum 5 words
2. Keep the essential meaning
3. Make it action-oriented
4. Remove unnecessary words
5. Return only the new short title, nothing else

Example:
Input: "I want to finish my Goal Planner app and launch it on the market and have 1000 paid user with monthly revenue of 5K"
Output: "Launch Goal Planner App"`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a title optimization assistant that creates concise, meaningful titles from longer descriptions.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 20,
  });

  const shortTitle = response.choices[0].message.content?.trim() || longTitle;
  return shortTitle.replace(/^"|"$/g, '').trim();
}

type MessageType = 'motivation' | 'reflection' | 'visualization';

interface GeneratedMessage {
  message: string;
  messageType: MessageType;
  isRead: boolean;
}

export async function generatePersonalizedMessage(userId: number, userGoals: any[] = []): Promise<NewPersonalizedMessage> {
  try {
    // Generate message type randomly
    const messageTypes = ['motivation', 'reflection', 'visualization'] as const;
    const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];

    // Create appropriate prompt based on message type
    let prompt = '';
    switch (messageType) {
      case 'motivation':
        prompt = `Write a short, personal motivational message (50-70 words) as if from my future self who has achieved great things. Focus on inner strength and potential. Keep it warm and encouraging.`;
        break;
      case 'reflection':
        prompt = `Write a brief, thoughtful reflection (50-70 words) as if from my future self looking back on the journey of growth and change. Focus on the learning experiences and personal insights gained.`;
        break;
      case 'visualization':
        prompt = `Create a vivid snapshot (50-70 words) from my successful future self, describing a moment of achievement and fulfillment. Paint a picture of the positive energy and satisfaction being experienced.`;
        break;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are writing a personalized message from the future self to the current self. The message should be heartfelt and personal, written in first person. Don't mention specific goals, but draw inspiration from their overall direction.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 150,
    });

    const generatedMessage = response.choices[0].message.content?.trim();

    if (!generatedMessage) {
      throw new Error("Empty response from OpenAI");
    }

    return {
      userId,
      message: generatedMessage,
      messageType,
      isRead: false,
    };
  } catch (error: any) {
    console.error("Failed to generate personalized message:", error);
    throw error;
  }
}