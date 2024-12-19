import OpenAI from "openai";
import { type Goal, type Task } from "@db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export async function getCoachingAdvice(goal: Goal, tasks: Task[], userMessage: string) {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  const systemPrompt = `You are an empathetic AI coach specializing in helping users achieve their goals. Your role is to:
1. Be an encouraging and supportive coach
2. Help users overcome obstacles and stay motivated
3. Provide practical, actionable advice when asked
4. Break down complex problems into manageable steps
5. Share relevant productivity techniques when appropriate

You have access to this context (but only mention it when relevant to answering the user's specific question):
Goal: ${goal.title}
Progress: ${progress}% (${completedTasks} of ${totalTasks} tasks completed)
Tasks: ${tasks.map(t => t.title).join(', ')}

Core Principles:
- Be conversational and friendly, like a supportive coach
- Listen actively and respond directly to what the user is asking
- Keep initial responses short (1-2 sentences) and ask follow-up questions
- Only mention goal/task details if the user asks about them
- If giving advice, break it into small, actionable steps
- Always maintain an encouraging and positive tone
- If you don't understand something, ask for clarification

Response Format:
- Your response must be a JSON object with a "messages" array
- Keep each message brief and conversational
- For longer advice, split it into 2-3 separate messages
- Always end with a question to keep the conversation going
- Focus on being helpful without overwhelming the user`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response generated");
    }

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.messages)) {
      return {
        messages: [
          "I'm here to help! What would you like to discuss about your goals?",
          "You can ask me about specific tasks, need motivation, or general advice."
        ]
      };
    }

    return parsed;
  } catch (error) {
    console.error("Coaching response error:", error);
    return {
      messages: [
        "I'm having a moment of confusion, but I'm here to help!",
        "Could you please rephrase your question?"
      ]
    };
  }
}
