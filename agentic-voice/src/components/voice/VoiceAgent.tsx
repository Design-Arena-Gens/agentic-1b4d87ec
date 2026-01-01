"use client";

import { useChat, UIMessage } from "@ai-sdk/react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, StopCircle, Volume2, VolumeX, Sparkles } from "lucide-react";

type RecognitionEventResult = {
  isFinal: boolean;
  [key: number]: {
    transcript: string;
  };
};

type RecognitionEvent = {
  resultIndex: number;
  results: RecognitionEventResult[];
};

type RecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
};

const recognitionFactory = (): RecognitionInstance | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const SpeechRecognition =
    (window as typeof window & {
      webkitSpeechRecognition?: new () => RecognitionInstance;
      SpeechRecognition?: new () => RecognitionInstance;
    }).SpeechRecognition ??
    (window as typeof window & {
      webkitSpeechRecognition?: new () => RecognitionInstance;
      SpeechRecognition?: new () => RecognitionInstance;
    }).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return null;
  }

  return new SpeechRecognition();
};

const extractMessageText = (message: UIMessage): string => {
  return message.parts
    .map((part) => (part.type === "text" ? part.text.trim() : ""))
    .filter(Boolean)
    .join(" ");
};

const systemStarter: UIMessage = {
  id: "system-intro",
  role: "assistant",
  parts: [
    {
      type: "text",
      text:
        "Hi, I'm Aura. Tap the microphone and tell me what you need. I can plan your day, summarise notes, or brainstorm ideas together.",
    },
  ],
};

export function VoiceAgent() {
  const { messages, sendMessage: sendChatMessage, status: chatStatus, stop, error, clearError } =
    useChat({
      messages: [systemStarter],
    });

  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSpokenMessageId = useRef<string | null>(systemStarter.id);

  const isSpeechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) &&
    "speechSynthesis" in window;

  const isBusy = chatStatus === "streaming" || chatStatus === "submitted";

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined") return;
      if (!autoSpeak) return;

      const synth = window.speechSynthesis;
      if (!synth) return;

      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 1.05;
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };
      utteranceRef.current = utterance;
      synth.speak(utterance);
    },
    [autoSpeak]
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, []);

  const ensureRecognition = useCallback(() => {
    if (recognitionRef.current) {
      return recognitionRef.current;
    }
    const instance = recognitionFactory();
    if (!instance) return null;

    instance.continuous = false;
    instance.interimResults = true;
    instance.lang = "en-US";
    recognitionRef.current = instance;
    return instance;
  }, []);

  const sendUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setStatusMessage("Thinking…");
      try {
        await sendChatMessage({ text: trimmed });
        setStatusMessage(null);
        clearError?.();
      } catch (err) {
        console.error("Failed to send message", err);
        setStatusMessage("Unable to reach Aura. Try again.");
      }
    },
    [clearError, sendChatMessage]
  );

  const startRecording = useCallback(() => {
    if (isBusy) {
      setStatusMessage("Aura is responding. Please wait a moment.");
      return;
    }

    const recognition = ensureRecognition();
    if (!recognition) {
      setStatusMessage("Speech recognition not supported in this browser.");
      return;
    }

    if (isRecording) {
      return;
    }

    stopSpeaking();
    setTranscript("");
    setStatusMessage("Listening…");

    recognition.onstart = () => {
      setIsRecording(true);
      setStatusMessage("Listening…");
    };

    recognition.onerror = (event: unknown) => {
      console.error("Speech recognition error", event);
      setIsRecording(false);
      setStatusMessage("Microphone error. Please try again.");
    };

    recognition.onend = () => {
      setIsRecording(false);
      setStatusMessage((current) => (current === "Listening…" ? null : current));
    };

    recognition.onresult = (event: RecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      const cleaned = (finalTranscript || interimTranscript).trim();
      setTranscript(cleaned);

      const trimmed = finalTranscript.trim();
      if (trimmed) {
        void sendUserMessage(trimmed);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Recognition start failed", err);
      setStatusMessage("Unable to access microphone.");
    }
  }, [ensureRecognition, isBusy, isRecording, sendUserMessage, stopSpeaking]);

  const stopRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.stop();
    recognition.onresult = null;
    setIsRecording(false);
    setStatusMessage(null);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const assistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "assistant") {
        return message;
      }
    }
    return null;
  }, [messages]);

  useEffect(() => {
    if (!assistantMessage) return;
    if (assistantMessage.id === lastSpokenMessageId.current) return;
    const text = extractMessageText(assistantMessage);
    if (!text) return;
    if (isBusy) return;

    lastSpokenMessageId.current = assistantMessage.id;
    speak(text);
  }, [assistantMessage, isBusy, speak]);

  const handleTextSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = textInput.trim();
      if (!trimmed) return;
      stopSpeaking();
      setTextInput("");
      void sendUserMessage(trimmed);
    },
    [sendUserMessage, stopSpeaking, textInput]
  );

  const renderMessage = useCallback((message: UIMessage) => {
    if (message.id === systemStarter.id) return null;
    const text = extractMessageText(message);
    if (!text) return null;
    const isUser = message.role === "user";

    return (
      <li key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm transition-colors ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-white/80 text-zinc-900 ring-1 ring-zinc-200 backdrop-blur"
          }`}
        >
          {text}
        </div>
      </li>
    );
  }, []);

  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 shadow-2xl">
      <div className="flex flex-col gap-2 text-white">
        <div className="flex items-center gap-2 text-white/80">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs uppercase tracking-[0.3em] text-white/60">Voice Agent</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Meet Aura</h1>
        <p className="text-sm text-white/70">
          Hold the mic to talk. Aura replies in real-time with natural voice and a friendly tone.
        </p>
      </div>

      <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
        <ul className="flex h-full flex-col gap-3 overflow-y-auto p-6">
          {messages.map(renderMessage)}
          {isBusy && (
            <li className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm text-zinc-900">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking…</span>
              </div>
            </li>
          )}
        </ul>
      </div>

      <div className="flex flex-col gap-4 text-white">
        {error && (
          <div className="rounded-2xl border border-red-400/60 bg-red-500/20 px-4 py-3 text-sm text-red-50">
            {error.message || "Sorry, I ran into a problem."}
          </div>
        )}
        {transcript && isRecording && (
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/80">
            <span className="font-medium text-white">You:</span> {transcript}
          </div>
        )}
        {statusMessage && (
          <div className="text-xs uppercase tracking-wide text-white/60">{statusMessage}</div>
        )}

        <form
          onSubmit={handleTextSubmit}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur md:flex-row"
        >
          <input
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            placeholder={
              isSpeechSupported
                ? "Ask Aura anything… (you can also use your voice)"
                : "Ask Aura anything…"
            }
            className="flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-blue-400 focus:outline-none"
          />

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!textInput.trim() || isBusy}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-white/20"
            >
              Send
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoSpeak((value) => {
                  const next = !value;
                  if (!next) {
                    stopSpeaking();
                  }
                  return next;
                });
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
            >
              {autoSpeak ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex flex-col text-xs text-white/60">
            <span>Auto speak is {autoSpeak ? "on" : "muted"}.</span>
            <span>{isSpeechSupported ? "Web Speech API detected." : "Voice mode unavailable in this browser."}</span>
          </div>

          <div className="flex items-center gap-3">
            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-red-400"
              >
                <StopCircle className="h-4 w-4" />
                Stop listening
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={!isSpeechSupported || isBusy}
                className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-white/20"
              >
                <Mic className="h-4 w-4" />
                {isSpeechSupported ? "Hold to talk" : "Voice unavailable"}
              </button>
            )}

            {isSpeaking && (
              <button
                type="button"
                onClick={stopSpeaking}
                className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
              >
                Stop voice
              </button>
            )}

            {isBusy && (
              <button
                type="button"
                onClick={stop}
                className="rounded-full border border-white/30 px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
              >
                Cancel reply
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
