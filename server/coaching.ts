import OpenAI from "openai";
import { type Goal, type Task } from "@db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export async function getCoachingAdvice(goal: Goal, tasks: Task[]) {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  const prompt = `You are an empathetic and supportive AI coach named Coach, having a conversation with the user about their goals. You're knowledgeable about productivity, motivation, and personal development.

Current context:
- Goal: "${goal.title}"
- Progress: ${progress}% complete (${completedTasks}/${totalTasks} tasks completed)
- Upcoming tasks: ${tasks.filter(t => !t.completed).map(t => `- ${t.title}`).join('\n')}

Guidelines for your responses:
1. Be conversational and natural, like a real coach chatting with their client
2. Keep each response short (max 2-3 sentences)
3. If you need to provide more information, break it into multiple short messages
4. Use the user's language and tone
5. Be encouraging but realistic
6. Reference specific tasks or progress when relevant
7. Ask follow-up questions to better understand and help the user

Respond with a JSON object that contains an array of messages:
{
  "messages": ["first message", "second message (if needed)", "third message (if needed)"]
}

Remember to:
- Keep each message conversational and brief
- End with a question if appropriate to keep the conversation going
- Show genuine interest in helping the user succeed`;

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
