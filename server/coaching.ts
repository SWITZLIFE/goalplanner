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
5. Share relevant productivity techniques when appropriate

Current Goal Context:
Goal: ${goal.title}
Progress: ${progress}% complete (${completedTasks}/${totalTasks} tasks)
Current Tasks:
${tasks.map((task, i) => `${i + 1}. ${task.title} (${task.completed ? 'Completed' : 'Pending'})`).join('\n')}

Remember to:
- Keep responses conversational and concise
- Listen actively and respond directly to what the user is saying
- Only mention goal/task details if directly relevant to the user's question
- Ask clarifying questions when needed
- Break longer responses into multiple shorter messages
- Maintain a supportive and encouraging tone

Response Guidelines:
- Format responses as a JSON array of messages
- Each message should be brief (1-2 sentences)
- Include follow-up questions to maintain engagement
- Address the user's immediate concerns first`;

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
