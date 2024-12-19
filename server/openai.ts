import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export async function generateTaskBreakdown(goalTitle: string): Promise<{ title: string; subtasks: string[] }[]> {
  const prompt = `Break down the following goal into actionable tasks with subtasks:
Goal: "${goalTitle}"

Please provide a JSON array where each task has a title and exactly 3 subtasks. Format:
[
  {
    "title": "Main task 1",
    "subtasks": ["Subtask 1", "Subtask 2", "Subtask 3"]
  }
]

Generate 3 main tasks, each with 3 subtasks that are specific, actionable, and measurable.`;

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
