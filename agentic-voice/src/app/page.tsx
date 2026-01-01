import { VoiceAgent } from "@/components/voice/VoiceAgent";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black py-16 px-4 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <div className="flex flex-col items-start gap-4">
          <p className="text-sm uppercase tracking-[0.3em] text-white/50">
            Agentic Experience
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Aura, your AI voice companion
          </h1>
          <p className="max-w-2xl text-base text-white/70">
            Ask questions, get guidance, and hear instant replies. Aura listens using
            on-device speech recognition and answers through our real-time AI stack.
          </p>
        </div>

        <VoiceAgent />
      </div>
    </div>
  );
}
