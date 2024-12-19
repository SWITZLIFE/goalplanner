import OpenAI from "openai";
import { type Goal, type Task } from "@db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export async function getCoachingAdvice(goal: Goal, tasks: Task[], userMessage: string) {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  const prompt = `You are an empathetic and supportive AI coach having a conversation with a user. Your role is to be helpful and responsive to what they're saying.

Current user message: "${userMessage}"

Goal context (only reference when directly relevant to the conversation):
Goal: "${goal.title}"
Progress: ${progress}% complete
Upcoming tasks: ${tasks.filter(t => !t.completed).map(t => `- ${t.title}`).join('\n')}

Conversation guidelines:
1. Focus on responding directly to what the user just said
2. If they ask for help, ask what specific help they need
3. If they express confusion or frustration, acknowledge their feelings and offer support
4. Only mention tasks or progress if the user specifically asks about them
5. Keep responses conversational and brief (1-2 sentences)
6. Ask follow-up questions to better understand their needs

Please provide your response in the following JSON format:
{
  "messages": ["your response", "optional follow up question"]
}

The response MUST be valid JSON with the exact format shown above.

Example good responses:
User: "I need help"
Response: ["I'm here to help! What specific aspect would you like assistance with?"]

User: "I don't know where to start"
Response: ["I understand it can feel overwhelming at first. Would you like to break down your first task together?"]

Remember:
- Respond directly to what the user just said
- Be conversational and natural
- Ask relevant follow-up questions
- Only mention goal details if specifically relevant`;

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
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.messages)) {
      console.error("Invalid response format:", content);
      return {
        messages: ["I apologize, but I'm having trouble processing your request right now. Could you please try asking your question again?"]
      };
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse OpenAI response:", error);
    return {
      messages: ["I apologize, but I'm having trouble understanding right now. Could you please rephrase your question?"]
    };
  }
}
