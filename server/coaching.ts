import OpenAI from "openai";
import { type Goal, type Task } from "@db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export async function getCoachingAdvice(goal: Goal, tasks: Task[], userMessage: string) {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  const systemPrompt = `You are an AI coach specializing in helping users achieve their goals. Your role is to:
1. Provide guidance and motivation
2. Help break down complex tasks into manageable steps
3. Offer specific, actionable advice
4. Be encouraging and supportive
5. Share relevant productivity techniques and best practices

${goal ? `Goal Context (only reference when relevant):
- Goal: ${goal.title}
- Progress: ${progress}% (${completedTasks} of ${totalTasks} tasks completed)
- Tasks: ${tasks.map(t => t.title).join(', ')}` : ''}

Core Principles:
- Keep responses concise but helpful
- Be specific to the user's situation
- Maintain a positive, motivating tone
- Provide practical, actionable advice
- Ask clarifying questions when needed
- Only mention goal details if directly relevant to the user's question
- Start with a friendly greeting for new conversations

Response Format:
- Your response must be a JSON object with a "messages" array
- Keep messages brief and conversational (2-3 sentences max)
- Focus on addressing the immediate question/concern
- End with an engaging question to continue the dialogue
- For complex advice, break it into smaller, digestible messages`;

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
