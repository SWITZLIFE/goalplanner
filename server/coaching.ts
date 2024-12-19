import OpenAI from "openai";
import { type Goal, type Task } from "@db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export async function getCoachingAdvice(goal: Goal, tasks: Task[]) {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  const prompt = `You are an empathetic and supportive AI coach named Coach. You're having a natural conversation with the user who is working on their goals. You have access to the following context, but only reference it when relevant to the conversation:

Available context (use only when relevant):
Goal: "${goal.title}"
Progress: ${progress}% complete
Upcoming tasks: ${tasks.filter(t => !t.completed).map(t => `- ${t.title}`).join('\n')}

Guidelines for your responses:
1. Focus on being a supportive conversation partner first
2. Keep responses natural and brief (1-2 sentences per message)
3. Ask questions to understand the user's needs
4. Only mention goal/task details when directly relevant to the user's question
5. If the user says they need help, ask what specific help they need
6. Break longer responses into multiple short messages for a natural chat flow

Example good responses:
User: "I need help"
Response: ["Hey! I'm here to help. What specific aspect would you like assistance with?"]

User: "I'm stuck on the current task"
Response: ["I see you're working on [current task]. What's the main challenge you're facing with it?"]

Respond with a JSON object:
{
  "messages": ["first message", "second message (if needed)", "third message (if needed)"]
}

Key reminders:
- Be conversational and natural
- Ask questions to keep the dialogue going
- Only reference goal/task details when directly relevant`;

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
