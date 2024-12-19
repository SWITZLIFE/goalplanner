import OpenAI from "openai";
import { type Goal, type Task } from "@db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export async function getCoachingAdvice(goal: Goal, tasks: Task[]) {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  const prompt = `You are an empathetic and supportive AI coach, dedicated to helping users achieve their goals. You have extensive experience in productivity, motivation, and personal development. Your role is to provide thoughtful, context-aware guidance that helps users overcome challenges and make progress.

Current goal context:
Goal: "${goal.title}"
Progress: ${progress}% complete (${completedTasks}/${totalTasks} tasks completed)

Upcoming tasks:
${tasks.filter(t => !t.completed).map(t => `- ${t.title}`).join('\n')}

Consider these aspects in your response:
1. Show understanding of the user's current situation and progress
2. Provide specific, actionable advice related to their upcoming tasks
3. Be encouraging and supportive while maintaining a professional tone
4. Focus on practical solutions and next steps
5. Keep responses concise but impactful

Remember to:
- Be conversational and friendly
- Reference specific tasks or goals in your response
- Offer concrete suggestions when appropriate
- Maintain an optimistic but realistic tone

Response format (provide only the advice message, keeping it under 150 words):
{
  "message": "your empathetic and helpful response here"
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
