import OpenAI from "openai";
import { type Goal, type Task } from "@db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export async function getCoachingAdvice(goal: Goal, tasks: Task[]) {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  const prompt = `As an AI coach, provide personalized advice for the following goal and progress:

Goal: "${goal.title}"
Progress: ${progress}% complete (${completedTasks}/${totalTasks} tasks completed)

Upcoming tasks:
${tasks.filter(t => !t.completed).map(t => `- ${t.title}`).join('\n')}

Please provide:
1. A short motivational message based on current progress
2. Actionable advice for tackling the next tasks
3. A productivity tip relevant to the goal type

Format the response as a JSON object:
{
  "motivation": "motivational message here",
  "advice": "specific advice here",
  "tip": "productivity tip here"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a supportive and knowledgeable AI coach that helps users achieve their goals by providing actionable advice and motivation.",
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
    throw new Error("Failed to generate coaching advice");
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to parse OpenAI response:", error);
    throw new Error("Failed to parse coaching advice");
  }
}
