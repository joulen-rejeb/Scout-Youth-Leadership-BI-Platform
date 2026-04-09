import { createFileRoute } from "@tanstack/react-router";
import { Check, RotateCcw, Sparkles, X } from "lucide-react";
import { useCallback, useState } from "react";
import gameBanner from "@/assets/5P4A3616-1024x683.jpg";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/scouting-game")({
  component: ScoutingGamePage,
});

type QuizItem = {
  question: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
};

const QUIZ: QuizItem[] = [
  {
    question: "What is the traditional Scout Motto?",
    options: ["Be Prepared", "Stay Strong", "Explore First", "Lead Always"],
    correct: 0,
  },
  {
    question: "Who is widely regarded as the founder of the Scout Movement?",
    options: [
      "Robert Baden-Powell",
      "Ernest Shackleton",
      "Marco Polo",
      "Florence Nightingale",
    ],
    correct: 0,
  },
  {
    question: "A bowline knot is most often used to create what?",
    options: [
      "A fixed loop at the end of a rope",
      "Two ropes of different thickness joined",
      "A sliding loop that tightens under load",
      "A decorative lanyard only",
    ],
    correct: 0,
  },
  {
    question: 'Which practice best matches the "Leave No Trace" idea on a hike?',
    options: [
      "Pack out everything you bring in",
      "Bury fruit peels in deep holes",
      "Mark trails with bright tape",
      "Leave food scraps for wildlife",
    ],
    correct: 0,
  },
  {
    question: "In many scout programs, a small team within a unit is called a:",
    options: ["Patrol", "Brigade", "Squadron", "Chapter"],
    correct: 0,
  },
  {
    question: "The fleur-de-lis is commonly used in scouting as:",
    options: [
      "A symbol of the global scout family",
      "A badge only for water activities",
      "A nautical warning sign",
      "A rank for first-aid instructors only",
    ],
    correct: 0,
  },
  {
    question: "When building a campfire, you should clear the ground and:",
    options: [
      "Keep water or sand nearby to put the fire out",
      "Use extra fuel to make the flame taller",
      "Build directly under low branches",
      "Leave the fire unattended briefly",
    ],
    correct: 0,
  },
  {
    question: "A core idea of scouting is learning through:",
    options: [
      "Doing activities outdoors and in the community",
      "Only written exams",
      "Watching videos alone",
      "Buying awards online",
    ],
    correct: 0,
  },
  {
    question: "The World Organization of the Scout Movement (WOSM) brings together scouts in:",
    options: [
      "Many countries around the world",
      "Only one region",
      "Cities but not rural areas",
      "Online forums only",
    ],
    correct: 0,
  },
  {
    question: "At camp, food should be stored away from sleeping areas mainly to:",
    options: [
      "Reduce attractants for animals",
      "Make tents lighter",
      "Follow a dress code",
      "Speed up morning roll call",
    ],
    correct: 0,
  },
];

type Attempt = { score: number; at: number };

function ScoutingGamePage() {
  const [phase, setPhase] = useState<"play" | "done">("play");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const total = QUIZ.length;
  const current = QUIZ[index];
  const answered = picked !== null;
  const isCorrect = answered && picked === current.correct;

  const recordAttempt = useCallback((finalScore: number) => {
    setAttempts((prev) => [{ score: finalScore, at: Date.now() }, ...prev]);
  }, []);

  const resetRound = () => {
    setPhase("play");
    setIndex(0);
    setPicked(null);
    setScore(0);
  };

  const choose = (i: number) => {
    if (answered || phase !== "play") return;
    setPicked(i);
    if (i === current.correct) {
      setScore((s) => s + 1);
    }
  };

  const goNext = () => {
    if (!answered) return;
    if (index < total - 1) {
      setIndex((n) => n + 1);
      setPicked(null);
    } else {
      recordAttempt(score);
      setPhase("done");
    }
  };

  const lastAttempt = attempts[0];
  const progressPct = phase === "play" ? ((index + (answered ? 1 : 0)) / total) * 100 : 100;

  return (
    <div className="space-y-8">
      <header className="relative flex min-h-[280px] overflow-hidden rounded-[6px] border border-red-100 bg-white/80 p-6 shadow-sm backdrop-blur-md sm:p-8">
        <img
          src={gameBanner}
          alt="Scouts playing and learning together"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-red-600/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-black/20" />
        <div className="relative mt-auto flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-white/85 drop-shadow-md">
              <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden />
              Play &amp; learn
            </p>
            <h1 className="font-display mt-2 text-3xl text-white drop-shadow-md sm:text-4xl">Scouting Game</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white drop-shadow-md">
              Ten quick multiple-choice questions about scouting in English. After each answer you will see if you were
              right and your running score. At the end, your result is saved for this session so you can compare tries.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-white/30 bg-white/20 px-4 py-2 text-sm font-medium text-white shadow-sm backdrop-blur-md">
              {phase === "play" ? (
                <>
                  Score: <span className="tabular-nums">{score}</span>
                  <span className="text-white/75"> / {total}</span>
                </>
              ) : (
                <>
                  Last run:{" "}
                  <span className="tabular-nums">
                    {lastAttempt?.score ?? 0}/{total}
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                resetRound();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-4 py-2 text-sm text-white shadow-sm backdrop-blur-md transition hover:bg-white/30"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              New game
            </button>
          </div>
        </div>
        <div className="absolute inset-x-6 bottom-5 h-2 overflow-hidden rounded-full bg-white/30 sm:inset-x-8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-white via-red-100 to-red-300 transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      </header>

      {phase === "play" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <article
            key={index}
            className="fade-up relative overflow-hidden rounded-[6px] border border-red-100 bg-white/80 p-6 shadow-sm backdrop-blur-md sm:p-8"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(239,172,178,0.12),transparent_50%)]" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#898082]">
                Question {index + 1} of {total}
              </p>
              <h2 className="font-display mt-4 text-xl leading-snug text-[#2a2629] sm:text-2xl">{current.question}</h2>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {current.options.map((opt, i) => {
                  const show = answered;
                  const isThis = i === picked;
                  const isAns = i === current.correct;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={answered}
                        onClick={() => choose(i)}
                        className={cn(
                          "group flex w-full items-start gap-3 rounded-[6px] border-2 bg-white/80 px-4 py-4 text-left text-sm leading-snug text-[#2a2629] shadow-sm backdrop-blur-md transition duration-200",
                          !show && "border-red-100 hover:-translate-y-0.5 hover:border-[#E31B23]/35 hover:shadow-md",
                          show && isAns && "border-[#27ae60] bg-[#27ae60]/10",
                          show && isThis && !isAns && "border-[#ca0314] bg-[#ca0314]/8",
                          show && !isThis && !isAns && "border-red-100 opacity-55",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition",
                            !show && "border-red-100 bg-white group-hover:border-[#E31B23]/40",
                            show && isAns && "border-[#27ae60] bg-[#27ae60] text-white",
                            show && isThis && !isAns && "border-[#ca0314] bg-[#ca0314] text-white",
                          )}
                        >
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="pt-0.5">{opt}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {answered ? (
                <div className="fade-up mt-8 flex flex-col gap-4 rounded-[6px] border border-red-100 bg-white/80 p-5 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        isCorrect ? "bg-[#27ae60]/15 text-[#27ae60]" : "bg-[#ca0314]/12 text-[#ca0314]",
                      )}
                    >
                      {isCorrect ? <Check className="h-5 w-5" strokeWidth={2.5} /> : <X className="h-5 w-5" strokeWidth={2.5} />}
                    </div>
                    <div>
                      <p className="font-medium text-[#2a2629]">{isCorrect ? "Nice one!" : "Not quite."}</p>
                      <p className="mt-1 text-sm text-[#898082]">
                        {isCorrect
                          ? "You earned a point this round."
                          : `The best answer was: “${current.options[current.correct]}”.`}
                      </p>
                      <p className="mt-2 text-sm font-medium text-[#2a2629]">
                        Running score:{" "}
                        <span className="tabular-nums text-[#ca0314]">
                          {score}/{total}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#ca0314] px-6 py-3 text-sm font-medium text-white shadow-md transition hover:bg-[#b00211]"
                  >
                    {index < total - 1 ? "Next question" : "See final score"}
                  </button>
                </div>
              ) : (
                <p className="mt-6 text-center text-sm text-[#898082]">Tap an answer to lock in this round.</p>
              )}
            </div>
          </article>

          <aside className="space-y-4">
            <div className="rounded-[6px] border border-red-100 bg-white/80 p-5 shadow-sm backdrop-blur-md">
              <h3 className="text-sm font-medium text-[#2a2629]">How it works</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#898082]">
                <li className="flex gap-2">
                  <span className="text-[#ca0314]">①</span>
                  Choose one option — there is no timer pressure.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#ca0314]">②</span>
                  See instant feedback and your running score.
                </li>
                <li className="flex gap-2">
                  <span className="text-[#ca0314]">③</span>
                  Finish all ten to log this attempt.
                </li>
              </ul>
            </div>
            <div className="rounded-[6px] border border-dashed border-red-100 bg-white/80 p-5 shadow-sm backdrop-blur-md">
              <p className="text-xs uppercase tracking-wider text-[#898082]">Session attempts</p>
              {attempts.length === 0 ? (
                <p className="mt-2 text-sm text-[#898082]">Complete a full quiz to build your history here.</p>
              ) : (
                <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {attempts.map((a, i) => (
                    <li
                      key={`${a.at}-${i}`}
                      className="flex items-center justify-between rounded-[6px] border border-red-100 bg-white/80 px-3 py-2 text-sm shadow-sm"
                    >
                      <span className="text-[#898082]">
                        {new Date(a.at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="font-semibold tabular-nums text-[#ca0314]">
                        {a.score}/{total}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="fade-up relative mx-auto max-w-2xl overflow-hidden rounded-[6px] border border-red-100 bg-white/80 p-10 text-center shadow-sm backdrop-blur-md">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#efacb2]/40 blur-3xl" />
          <div className="relative">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-[#f39c12]/40 bg-gradient-to-br from-[#fff5e6] to-[#ffe8cc] text-4xl shadow-inner">
              {score >= 8 ? "🏆" : score >= 5 ? "⚜️" : "🌿"}
            </div>
            <h2 className="font-display mt-6 text-3xl text-[#2a2629]">Round complete!</h2>
            <p className="mt-2 text-lg text-[#898082]">
              You scored{" "}
              <span className="font-semibold tabular-nums text-[#ca0314]">
                {score} out of {total}
              </span>
              .
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#898082]">
              {score === total
                ? "Perfect run — outstanding scouting knowledge!"
                : score >= 8
                  ? "Excellent work — a few details to polish and you are golden."
                  : score >= 5
                    ? "Solid try — play again to sharpen outdoor and scout basics."
                    : "Great practice round — each attempt helps you remember more."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={resetRound}
                className="inline-flex items-center gap-2 rounded-lg bg-[#ca0314] px-6 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-[#b00211]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Play again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
