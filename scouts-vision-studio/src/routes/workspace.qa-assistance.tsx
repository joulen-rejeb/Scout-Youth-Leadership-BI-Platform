import { createFileRoute } from "@tanstack/react-router";
import { Loader2, RotateCcw, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import scoutBotBanner from "@/assets/8U5A0505-scaled.jpg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/qa-assistance")({
  component: QaAssistancePage,
});

const QUICK_QUESTIONS = [
  { id: 1, emoji: "🏕️", text: "How do I join a scout group?" },
  { id: 2, emoji: "⛺", text: "What do scouts do?" },
  { id: 3, emoji: "🎒", text: "What should I bring to camp?" },
  { id: 4, emoji: "🥇", text: "How do I move up in ranks?" },
  { id: 5, emoji: "🪢", text: "Which knots should a scout know?" },
  { id: 6, emoji: "📜", text: "What is the Scout Law and Promise?" },
  { id: 7, emoji: "🌍", text: "What is the World Scout Jamboree?" },
  { id: 8, emoji: "👨‍✈️", text: "How do I become a scout leader?" },
  { id: 9, emoji: "🛡️", text: "Are scout camps safe?" },
  { id: 10, emoji: "👨‍👩‍👧", text: "Can parents take part?" },
] as const;

const ASSISTANT_NAME = "ScoutBot";

const WELCOME_TEXT =
  "Hi there! 👋 I’m ScoutBot, your scouting helper. Ask me anything about scouts, camps, or activities — I’m glad to help.";

type ChatLine =
  | { kind: "welcome" }
  | { kind: "user"; id: string; text: string; time: string }
  | { kind: "bot"; id: string; text: string; time: string };

function timeChat() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const CHAT_ENDPOINT = "/api/scoutbuddy/chat";

const GENERIC_ERROR_EN =
  "Sorry, we could not get an answer right now. Please try again. If it keeps happening, restart the chat program (npm run scoutbuddy) and check GROQ_API_KEY or ANTHROPIC_API_KEY in scoutbuddy/.env.";

function normalizeBotReply(text: string): string {
  const low = text.toLowerCase();
  if (low.includes("désolé") && low.includes("erreur")) {
    return GENERIC_ERROR_EN;
  }
  return text;
}

function QaAssistancePage() {
  const [lines, setLines] = useState<ChatLine[]>([{ kind: "welcome" }]);
  const [welcomeTime] = useState(() => timeChat());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollBottom();
  }, [lines, loading, scrollBottom]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || loading) return;

    const userLine: ChatLine = { kind: "user", id: crypto.randomUUID(), text, time: timeChat() };
    setLines((prev) => [...prev, userLine]);
    setLoading(true);

    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      let data: { bot_response?: string; error?: string } = {};
      try {
        data = (await res.json()) as { bot_response?: string; error?: string };
      } catch {
        data = {};
      }

      let reply: string;
      if (!res.ok) {
        reply =
          "We could not get an answer right now. Please try again, or check that the chat service is running.";
      } else if (data.bot_response) {
        reply = normalizeBotReply(data.bot_response);
      } else if (data.error) {
        reply = "Your message could not be sent. Please type something and try again.";
      } else {
        reply = "Sorry, something went wrong. Please try again in a moment.";
      }

      setLines((prev) => [...prev, { kind: "bot", id: crypto.randomUUID(), text: reply, time: timeChat() }]);
    } catch {
      setLines((prev) => [
        ...prev,
        {
          kind: "bot",
          id: crypto.randomUUID(),
          text: "We could not reach the chat helper. Run npm run scoutbuddy from the project folder, then try again.",
          time: timeChat(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setLines([{ kind: "welcome" }]);
    setInput("");
  };

  return (
    <div className="space-y-6">
      <section className="relative flex h-[280px] overflow-hidden rounded-[6px] border border-red-100 bg-white/80 p-6 shadow-sm backdrop-blur-md sm:p-8">
        <img
          src={scoutBotBanner}
          alt="ScoutBot support"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-red-600/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-black/15" />
        <div className="relative mt-auto flex w-full flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/85 drop-shadow-md">Questions &amp; answers</p>
            <h1 className="mt-2 font-display text-3xl text-white drop-shadow-md sm:text-4xl">{ASSISTANT_NAME}</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white drop-shadow-md">
              Ask about scouting in plain language: camps, skills, how groups work, and staying safe outdoors.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-[6px] border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Ready to chat
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <aside className="space-y-4">
          <div className="rounded-[6px] border border-red-100 bg-white/80 p-5 shadow-sm backdrop-blur-md">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[6px] border border-red-100 bg-white/80 text-lg">
              🏕️
            </div>
            <h2 className="text-base font-medium text-[#2a2629]">About this helper</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#898082]">
              Q&amp;A Assistance answers everyday questions about scouting: games outside, values, trips, and how groups are run.
            </p>
          </div>
          <div className="rounded-[6px] border border-red-100 bg-white/80 p-5 shadow-sm backdrop-blur-md">
            <h3 className="text-sm font-medium text-[#2a2629]">Topics</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#898082]">
              <li>⚜️ Story &amp; values</li>
              <li>🌿 Outdoor fun</li>
              <li>🪢 Practical skills</li>
              <li>🎖️ Ranks &amp; badges</li>
              <li>🌍 Big events</li>
              <li>🎒 Camps &amp; gear</li>
            </ul>
          </div>
          <p className="rounded-[6px] border border-red-100 bg-white/80 p-4 text-sm text-[#898082] shadow-sm backdrop-blur-md">
            💡 Tip: use a quick question or type your own. With npm run dev, chat goes through Node (no Python needed). Restart
            dev after changing scoutbuddy/.env.
          </p>
        </aside>

        <section className="flex min-h-[520px] flex-col overflow-hidden rounded-[6px] border border-red-100 bg-white/80 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-red-100 bg-white/80 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-red-100 bg-white text-lg">
                ⚜️
              </div>
              <div>
                <p className="text-sm font-medium text-[#2a2629]">{ASSISTANT_NAME}</p>
                <p className="text-xs text-[#898082]">Scouting topics only</p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearChat}
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-red-100 bg-white/80 px-3 text-xs text-[#2a2629] transition hover:bg-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear chat
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(at_top,_#ffffff,_#fdf2f2_45%,_transparent)] px-4 py-4"
          >
            <div className="flex justify-center">
              <span className="rounded-full border border-red-100 bg-white/90 px-3 py-1 text-[10px] uppercase tracking-wider text-[#898082]">
                Today
              </span>
            </div>

            {lines.map((line) => {
              if (line.kind === "welcome") {
                return (
                  <div key="welcome" className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-100 bg-white text-sm">
                      ⚜️
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#898082]">{ASSISTANT_NAME}</p>
                      <div className="mt-1 rounded-2xl rounded-tl-sm border border-red-100 bg-white/95 px-4 py-3 text-sm leading-relaxed text-[#2a2629] shadow-sm">
                        {WELCOME_TEXT}
                      </div>
                      <p className="mt-1 text-[10px] text-[#898082]">{welcomeTime}</p>
                    </div>
                  </div>
                );
              }
              if (line.kind === "user") {
                return (
                  <div key={line.id} className="flex flex-row-reverse gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-100 bg-[#ca0314]/10 text-sm">
                      👤
                    </div>
                    <div className="min-w-0 max-w-[85%] text-right">
                      <div className="inline-block rounded-2xl rounded-tr-sm border border-[#ca0314]/20 bg-[#ca0314]/12 px-4 py-3 text-left text-sm leading-relaxed text-[#2a2629]">
                        {line.text}
                      </div>
                      <p className="mt-1 text-[10px] text-[#898082]">{line.time}</p>
                    </div>
                  </div>
                );
              }
              return (
                <div key={line.id} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-100 bg-white text-sm">
                    ⚜️
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#898082]">{ASSISTANT_NAME}</p>
                    <div className="mt-1 rounded-2xl rounded-tl-sm border border-red-100 bg-white/95 px-4 py-3 text-sm leading-relaxed text-[#2a2629] shadow-sm">
                      {line.text}
                    </div>
                    <p className="mt-1 text-[10px] text-[#898082]">{line.time}</p>
                  </div>
                </div>
              );
            })}

            {loading ? (
              <div className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-100 bg-white text-sm">
                  ⚜️
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-red-100 bg-white/95 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#ca0314]/60 [animation-delay:-0.2s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#ca0314]/60 [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#ca0314]/60" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-red-100 bg-white/85 px-4 py-3 backdrop-blur-md">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#898082]">Quick questions</p>
            <div className="mb-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  disabled={loading}
                  onClick={() => void send(q.text)}
                  className={cn(
                    "rounded-full border border-red-100 bg-white/90 px-3 py-1.5 text-left text-xs text-[#2a2629] transition hover:border-[#ca0314]/30 hover:bg-[#ca0314]/5",
                    loading && "pointer-events-none opacity-50",
                  )}
                >
                  {q.emoji} {q.text}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const t = input.trim();
                setInput("");
                void send(t);
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                placeholder="Ask about scouts or camping..."
                className="min-h-11 flex-1 rounded-[6px] border border-red-100 bg-white/95 px-4 text-sm text-[#2a2629] outline-none ring-[#ca0314]/20 placeholder:text-[#898082] focus:ring-2 disabled:opacity-60"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[#ca0314] px-4 text-sm font-medium text-white transition hover:bg-[#b00211] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
            <p className="mt-2 text-[10px] text-[#898082]">
              {ASSISTANT_NAME} only answers scouting-related questions.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
