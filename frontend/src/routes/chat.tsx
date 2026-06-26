import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Volume2, Bot, Mic } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { SosButton } from "@/components/sos-button";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Health Assistant" }] }),
  component: ChatPage,
});

type Msg = { id: number; from: "bot" | "user"; text: string };

const QUICK_QUESTIONS = [
  "How to use card?",
  "Find medicine",
  "Nearest hospital",
  "Book a camp",
  "Check symptoms",
];

const BOT_REPLY: Record<string, string> = {
  "How to use card?":
    "Tap 'Government Schemes', scan your Ayushman card, and we'll show the benefits you can use right away.",
  "Find medicine":
    "Go to 'Check Symptoms' or share the medicine name and I'll point you to the nearest pharmacy with prices.",
  "Nearest hospital":
    "Open your triage results to see hospitals sorted by distance with one-tap directions.",
  "Book a camp": "Head to 'Health Camps' to see free camps near you and register in one tap.",
  "Check symptoms": "Use the 'Check Symptoms' page — speak or take a photo and our AI will guide you.",
};

let idSeq = 2;

function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 1,
      from: "bot",
      text: "Namaste! I'm your health assistant. Ask me anything or tap a quick question below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    const value = text.trim();
    if (!value) return;
    const userMsg: Msg = { id: idSeq++, from: "user", text: value };
    setInput("");
    setMessages((m) => [...m, userMsg]);

    setTimeout(() => {
      const reply =
        BOT_REPLY[value] ??
        "I'm here to help with schemes, camps, medicines, and symptoms. Could you tell me a bit more?";
      setMessages((m) => [...m, { id: idSeq++, from: "bot", text: reply }]);
    }, 600);
  };

  const speak = (msg: Msg) => {
    if (speakingId === msg.id) {
      setSpeakingId(null);
      return;
    }
    setSpeakingId(msg.id);
    toast("Playing audio", { description: "Reading the answer aloud" });
    setTimeout(() => setSpeakingId((cur) => (cur === msg.id ? null : cur)), 3000);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-28">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-5 py-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-6 w-6" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-lg font-black text-foreground">Health Assistant</h1>
            <p className="text-xs font-semibold text-secondary">● Online · speaks your language</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="mx-auto w-full max-w-md flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((m) =>
          m.from === "bot" ? (
            <div key={m.id} className="flex items-end gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4.5 w-4.5" />
              </span>
              <div className="max-w-[80%] rounded-2xl rounded-bl-md border-2 border-border bg-card px-4 py-3">
                <p className="text-[15px] leading-relaxed text-foreground">{m.text}</p>
                <button
                  type="button"
                  onClick={() => speak(m)}
                  aria-label="Play audio"
                  className={
                    "mt-2 flex items-center gap-1.5 text-xs font-bold " +
                    (speakingId === m.id ? "text-primary" : "text-muted-foreground")
                  }
                >
                  <Volume2 className="h-4 w-4" />
                  {speakingId === m.id ? "Playing..." : "Listen"}
                </button>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground">
                {m.text}
              </div>
            </div>
          ),
        )}
      </div>

      {/* Composer */}
      <div className="fixed inset-x-0 bottom-[64px] z-20 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-5 py-3">
          {/* Quick questions */}
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="shrink-0 whitespace-nowrap rounded-full border-2 border-border bg-background px-4 py-2 text-sm font-semibold text-foreground active:bg-muted"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => toast("Voice input coming soon")}
              aria-label="Voice input"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-border bg-background text-primary active:bg-muted"
            >
              <Mic className="h-5 w-5" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              className="h-12 min-w-0 flex-1 rounded-full border-2 border-border bg-background px-4 text-[15px] text-foreground outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow active:scale-95 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      <SosButton />
      <BottomNav />
    </div>
  );
}
