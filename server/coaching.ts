import OpenAI from "openai";
import { type Goal, type Task } from "@db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export async function getCoachingAdvice(goal: Goal, tasks: Task[]) {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  const prompt = `You are an empathetic and supportive AI coach, dedicated to helping users achieve their goals. Your role is to provide thoughtful, context-aware guidance that helps users overcome challenges and make progress.

Current goal context:
Goal: "${goal.title}"
Progress: ${progress}% complete (${completedTasks}/${totalTasks} tasks completed)

Upcoming tasks:
${tasks.filter(t => !t.completed).map(t => `- ${t.title}`).join('\n')}

Please provide a helpful, empathetic response that:
1. Shows understanding of the user's current situation
2. Provides specific advice about their upcoming tasks
3. Maintains an encouraging and supportive tone
4. Offers practical solutions
5. Stays concise but impactful (under 150 words)

Respond with a JSON object in this format:
{
  "message": "your empathetic and helpful response here"
}

Remember to reference specific tasks and maintain a conversational, friendly tone while being professional and motivational.`;

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
