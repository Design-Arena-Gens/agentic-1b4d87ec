# Aura Voice Agent

Aura is a web-based voice companion built with Next.js. Talk to the assistant using your microphone, receive AI-generated answers, and hear the response through natural text-to-speech playback.

## Features

- 🎙️ **Hands-free input** – Uses the browser's Web Speech API for live speech recognition.
- 🧠 **Streaming AI replies** – Powered by OpenAI via the Vercel AI SDK for fast, coherent responses.
- 🔊 **Voice output** – Speaks answers automatically with tunable voice playback controls.
- 💬 **Chat transcript** – Keeps a conversation history with user/assistant bubbles.
- ⚡ **Edge-ready UX** – Polished Tailwind design optimised for Vercel deployments.

## Prerequisites

- Node.js 18 or newer.
- An OpenAI API key available as the `OPENAI_API_KEY` environment variable.
- A Chromium-based browser for the best speech recognition results.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file and add your OpenAI credentials:
   ```bash
   echo "OPENAI_API_KEY=sk-..." > .env.local
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) and allow microphone access when prompted.

> **Tip:** If your browser does not expose the Web Speech API, voice capture controls will be disabled automatically. You can still chat by typing.

## Production Build

```bash
npm run build
npm run start
```

## Deployment

This project is optimised for Vercel. After confirming your `OPENAI_API_KEY` is available as a production environment variable, deploy with:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-voice
```

Once the deployment finishes, verify the application with:

```bash
curl https://agentic-1b4d87ec.vercel.app
```

## Folder Structure

```
src/
  app/
    api/chat/route.ts   # Streaming chat endpoint using OpenAI
    page.tsx            # Landing page wiring the voice agent
  components/
    voice/VoiceAgent.tsx  # Client-side voice experience
```

## Troubleshooting

- **Microphone errors:** Ensure the site has permission to use your microphone and no other application is locking the audio input.
- **Missing audio output:** Toggle the speaker icon to re-enable voice playback. Some browsers require an initial user interaction before speech synthesis works.
- **API failures:** Confirm `OPENAI_API_KEY` is set locally/in production and that your quota covers gpt-4o-mini usage.

Enjoy building with Aura!
