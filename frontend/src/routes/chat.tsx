import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Volume2, Bot, Mic } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { SosButton } from "@/components/sos-button";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Health Assistant" }] }),
  component: ChatPage,
});

type Msg = { id: number; from: "bot" | "user"; text: string; animate?: boolean };

const QUICK_QUESTIONS = [
  "How to use card?",
  "Find medicine",
  "Nearest hospital",
  "Book a camp",
  "Check symptoms",
];

function cleanText(text: string): string {
  // Remove markdown bold asterisks (**)
  let cleaned = text.replace(/\*\*/g, "");
  // Replace leading * bullet points on a line with •
  cleaned = cleaned.replace(/^\s*\*\s+/gm, "• ");
  // Remove any remaining lone asterisks
  cleaned = cleaned.replace(/\*/g, "");
  return cleaned.trim();
}

function TypewriterText({
  text,
  onType,
  onComplete,
}: {
  text: string;
  onType?: () => void;
  onComplete?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let index = 0;
    const intervalId = setInterval(() => {
      setDisplayedText((prev) => {
        const next = prev + text.charAt(index);
        index++;
        if (index >= text.length) {
          clearInterval(intervalId);
          setTimeout(() => {
            onComplete?.();
          }, 30);
        }
        // Let the DOM update its scrollHeight before triggering scroll
        setTimeout(() => {
          onType?.();
        }, 0);
        return next;
      });
    }, 12); // Fast and smooth typing speed

    return () => clearInterval(intervalId);
  }, [text]);

  return <>{displayedText}</>;
}

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
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  };

  // Smooth scroll to bottom when message length changes or typing indicator is toggled
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length, isTyping]);

  const send = async (text: string) => {
    const value = text.trim();
    if (!value) return;
    const userMsg: Msg = { id: idSeq++, from: "user", text: value };
    setInput("");
    
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    setIsTyping(true);
    try {
      const payload = {
        messages: newMessages.map((m) => ({
          role: m.from,
          text: m.text,
        })),
      };

      const res = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify(payload),
      }) as { reply: string };

      const cleanedReply = cleanText(res.reply);
      setMessages((m) => [
        ...m,
        { id: idSeq++, from: "bot", text: cleanedReply, animate: true },
      ]);
    } catch (err) {
      toast.error("Failed to connect to Health Assistant");
      console.error(err);
    } finally {
      setIsTyping(false);
    }
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
    <div className="flex h-dvh flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card/95 backdrop-blur z-20">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-5 py-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-6 w-6" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-lg font-black text-foreground">Health Assistant</h1>
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse"></span>
              Online · speaks your language
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div 
        ref={scrollRef} 
        className="mx-auto w-full max-w-md flex-1 space-y-4 overflow-y-auto px-5 py-5 pb-56 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {messages.map((m) =>
          m.from === "bot" ? (
            <div key={m.id} className="flex items-end gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4.5 w-4.5" />
              </span>
              <div className="max-w-[80%] rounded-2xl rounded-bl-md border-2 border-border bg-card px-4 py-3">
                <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                  {m.animate ? (
                    <TypewriterText
                      text={m.text}
                      onType={() => scrollToBottom("auto")}
                      onComplete={() => {
                        setMessages((currentMsgs) =>
                          currentMsgs.map((msg) =>
                            msg.id === m.id ? { ...msg, animate: false } : msg
                          )
                        );
                      }}
                    />
                  ) : (
                    m.text
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => speak(m)}
                  aria-label="Play audio"
                  className={
                    "mt-2 flex items-center gap-1.5 text-xs font-bold transition-colors " +
                    (speakingId === m.id ? "text-primary" : "text-muted-foreground hover:text-foreground")
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

        {isTyping && (
          <div className="flex items-end gap-2 animate-fade-in">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-4.5 w-4.5" />
            </span>
            <div className="max-w-[80%] rounded-2xl rounded-bl-md border-2 border-border bg-card px-4 py-3">
              <div className="flex items-center gap-1 py-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></span>
              </div>
            </div>
          </div>
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
                className="shrink-0 whitespace-nowrap rounded-full border-2 border-border bg-background px-4 py-2 text-sm font-semibold text-foreground active:bg-muted transition-colors hover:border-primary/50"
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
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-border bg-background text-primary active:bg-muted transition-colors hover:border-primary/50"
            >
              <Mic className="h-5 w-5" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              className="h-12 min-w-0 flex-1 rounded-full border-2 border-border bg-background px-4 text-[15px] text-foreground outline-none focus:border-primary transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow active:scale-95 disabled:opacity-50 transition-all"
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
