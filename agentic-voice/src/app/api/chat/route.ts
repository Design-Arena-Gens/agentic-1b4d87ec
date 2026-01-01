import { NextRequest } from "next/server";
import { convertToModelMessages, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const VOICE_AGENT_PROMPT = `You are "Aura", a warm, succinct voice assistant that helps users with day to day tasks.
- Keep responses short (under 90 words) so they fit into speech.
- Use conversational tone with positive energy.
- When asked for step-by-step instructions, keep them concise and numbered.
- Never mention being an AI language model or having text based interface.`;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Missing OPENAI_API_KEY environment variable.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { messages } = body ?? {};

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({
          error: "Invalid request payload. Expecting { messages: UIMessage[] }.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = await streamText({
      model: openai("gpt-4o-mini"),
      messages: await convertToModelMessages(messages),
      system: VOICE_AGENT_PROMPT,
      maxOutputTokens: 600,
      temperature: 0.6,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("/api/chat error", error);
    return new Response(
      JSON.stringify({
        error: "Voice agent failed to respond. Check server logs for details.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
