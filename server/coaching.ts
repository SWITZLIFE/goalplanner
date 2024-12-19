import OpenAI from "openai";
import { type Goal, type Task } from "@db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_2,
});

export async function getCoachingAdvice(goal: Goal, tasks: Task[], userMessage: string) {
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  const mainTasks = tasks.filter(t => !t.isSubtask);
  const taskProgress = mainTasks.map(task => {
    const subtasks = tasks.filter(t => t.parentTaskId === task.id);
    const completedSubtasks = subtasks.filter(t => t.completed).length;
    return {
      title: task.title,
      completed: task.completed,
      subtaskProgress: subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0
    };
  });

  const systemPrompt = `You are an AI coach specializing in helping users achieve their goals through personalized guidance and motivation. Your role is to:

1. Provide guidance and motivation tailored to the user's current progress
2. Help break down complex tasks into manageable steps
3. Offer specific, actionable advice based on their situation
4. Be encouraging and supportive while maintaining professionalism
5. Share relevant productivity techniques and best practices
6. Help users overcome obstacles and stay focused

Current Goal Context:
Goal: "${goal.title}"
Overall Progress: ${progress}%
Tasks Overview: ${taskProgress.map(t => 
  `\n- ${t.title} (${t.completed ? 'Completed' : `${t.subtaskProgress}% of subtasks done`})`
).join('')}

Conversation Guidelines:
- Keep responses concise but helpful (2-3 sentences per message)
- Be specific to the user's situation and current progress
- Maintain a positive, motivating tone
- Provide practical, actionable advice when asked
- Ask clarifying questions when needed
- Reference specific tasks or progress when relevant
- Always acknowledge user's concerns or challenges

Response Principles:
- Personalize responses based on their progress and tasks
- Offer specific suggestions rather than generic advice
- Be encouraging but realistic about challenges
- Help users break down any obstacles into smaller steps
- Maintain a supportive and professional coaching relationship

Response Format:
- Return a JSON object with a "messages" array
- Keep individual messages focused and concise
- End with an engaging question related to their goals
- Use a mix of motivation and practical guidance`;

  try {
    // Generate a more natural coaching response
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
      throw new Error("Failed to generate coaching response");
    }

    try {
      const parsed = JSON.parse(content);
      
      // Ensure we have valid messages array
      if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
        console.warn("Invalid message format received:", content);
        return {
          messages: [
            "I understand you're looking for guidance. Could you tell me more about what specific aspect of your goal you'd like to discuss?",
            "I can help with task planning, motivation, or specific challenges you're facing."
          ]
        };
      }

      // Format and structure the messages
      const formattedMessages = parsed.messages.map((msg: string) => {
        // Clean up any markdown or excessive formatting
        return msg.trim()
          .replace(/^\s*[-*]\s+/g, '') // Remove leading bullets
          .replace(/\n{3,}/g, '\n\n'); // Normalize line breaks
      });

      // Ensure we always end with a question if we don't already
      if (!formattedMessages[formattedMessages.length - 1].endsWith('?')) {
        formattedMessages.push(
          "Is there anything specific about that you'd like me to clarify or expand on?"
        );
      }

      return { messages: formattedMessages };
    } catch (parseError) {
      console.error("Failed to parse coaching response:", parseError);
      throw new Error("Invalid response format");
    }
  } catch (error) {
    console.error("Coaching response error:", error);
    
    // Provide a more helpful fallback response
    return {
      messages: [
        "I want to make sure I give you the best possible guidance.",
        "Could you please rephrase your question, focusing on what specific aspect of your goal you'd like help with?"
      ]
    };
  }
}
