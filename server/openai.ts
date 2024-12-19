import OpenAI from "openai";

const openai = new OpenAI({
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

Remember: The response MUST contain exactly ${numTasks} main tasks.`;

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
