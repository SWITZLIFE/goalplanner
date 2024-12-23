import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY must be set");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

export async function generateMotivationalQuote(goalDescription: string): Promise<string> {
  const prompt = `Generate a short, powerful motivational quote (max 120 characters) that relates to this goal: "${goalDescription}"

Requirements:
1. The quote should be inspiring and relate to the goal's theme
2. Keep it under 120 characters
3. Make it personal and actionable
4. Focus on growth, progress, and achievement
5. Return only the quote text, no attribution or extra formatting

Example response format:
"Your journey of a thousand miles begins with the courage to take the first step."`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a motivational coach who creates personalized, inspiring quotes. Be concise but impactful."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 60,
  });

  const quote = response.choices[0].message.content?.trim() || "Every step forward is a step toward your dreams.";
  return quote.replace(/^["']|["']$/g, ''); // Remove any quotes if present
}