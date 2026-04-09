import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Lightbulb,
  LineChart,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  UploadCloud,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  LineChart as RechartsLine,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatLeadershipRole } from "@/lib/leadership-role";
import { cn } from "@/lib/utils";
import { useCurrentProfile } from "@/lib/use-current-profile";

export const Route = createFileRoute("/workspace/predictions")({
  component: PredictionsPage,
});

const FLOW_OPTIONS = [
  { label: "Expenses", value: 1.0 },
  { label: "Income", value: 2.0 },
] as const;

const SEASON_OPTIONS = [
  { label: "2023-2024", value: 2023 },
  { label: "2024-2025", value: 2024 },
  { label: "2025-2026", value: 2025 },
  { label: "2026-2027", value: 2026 },
] as const;

const BUDGET_SUB_CATEGORY_OPTIONS = [
  { label: "Transport", value: 1.0 },
  { label: "Food & Catering", value: 2.0 },
  { label: "Accommodation", value: 3.0 },
  { label: "Equipment", value: 4.0 },
  { label: "Activities", value: 5.0 },
] as const;

const PARTICIPATION_TIERS = [
  {
    min: 0,
    max: 5,
    title: "Low reach",
    guidance:
      "Start by growing views and reactions.",
    color: "#E74C3C",
  },
  {
    min: 5,
    max: 15,
    title: "Good start",
    guidance: "Try posting at better times to reach more people.",
    color: "#F39C12",
  },
  {
    min: 15,
    max: 35,
    title: "Strong reactions",
    guidance: "Keep the post styles that bring the most reactions.",
    color: "#27AE60",
  },
  {
    min: 35,
    max: Infinity,
    title: "Wide reach",
    guidance: "Keep the same rhythm and reuse what works well.",
    color: "#1A9B6C",
  },
] as const;

const STRATEGIC_TIERS = [
  {
    label: "Needs care",
    color: "#E74C3C",
    test: (ratio: number, apm: number) => ratio < 0.08 || apm < 1,
  },
  {
    label: "On track",
    color: "#F39C12",
    test: (ratio: number, apm: number) =>
      ratio >= 0.08 && ratio < 0.15 && apm >= 1,
  },
  {
    label: "Strong",
    color: "#27AE60",
    test: (ratio: number, apm: number) => ratio >= 0.15 && apm >= 2,
  },
] as const;

const RADAR_SUBJECTS = [
  "Leaders",
  "Activities",
  "Girls joining",
  "Variety",
  "Unit size",
] as const;

/** Fixed ghost “Target” series (paired with Radar subject order). */
const GHOST_TARGET_VALUES = [75, 75, 60, 60, 50] as const;

function deriveParticipationTier(engagementPct: number, visibilityPct: number) {
  const score = engagementPct * 0.6 + visibilityPct * 0.4;
  return (
    PARTICIPATION_TIERS.find((t) => score >= t.min && score < t.max) ??
    PARTICIPATION_TIERS[0]
  );
}

function deriveStrategicTier(ratio: number, apm: number) {
  return STRATEGIC_TIERS.find((t) => t.test(ratio, apm)) ?? STRATEGIC_TIERS[1];
}

function mlEndpoint(path: string): string {
  const base = import.meta.env.VITE_SCOUT_ML_URL as string | undefined;
  if (base !== undefined && base !== "") {
    return `${base.replace(/\/$/, "")}${path}`;
  }
  return `/api/ml${path}`;
}

type MembershipInsight = {
  projected_membership: number;
  historical: number[];
  seasons: string[];
  trajectory_summary: string;
  change_pct: number;
};

type ForecastUploadRow = {
  season: string;
  members: number;
};

function nextSeasonLabel(season: string): string {
  const [start, end] = season.split("-");
  const startYear = Number(start);
  const endYear = Number(end);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return "Next season";
  return `${startYear + 1}-${endYear + 1}`;
}

function applyUploadedForecastData(base: MembershipInsight, rows: ForecastUploadRow[]): MembershipInsight {
  const cleanRows = rows.filter((row) => row.season && Number.isFinite(row.members) && row.members > 0);
  if (cleanRows.length === 0) return base;

  const baseHistory = base.historical.map((value) => Math.round(Number(value)));
  const uploadedHistory = cleanRows.map((row) => Math.round(row.members));
  const fullHistory = [...baseHistory, ...uploadedHistory];
  const fullSeasons = [...base.seasons.slice(0, baseHistory.length), ...cleanRows.map((row) => row.season)];
  const recent = fullHistory.slice(-3);
  const previous = recent[recent.length - 2] ?? fullHistory[fullHistory.length - 2] ?? base.projected_membership;
  const current = recent[recent.length - 1] ?? base.projected_membership;
  const momentum = current - previous;
  const projected = Math.max(1, Math.round(current + Math.max(6, momentum * 1.25)));
  const lastActual = fullHistory[fullHistory.length - 1] || 1;

  return {
    projected_membership: projected,
    historical: fullHistory,
    seasons: [...fullSeasons, nextSeasonLabel(fullSeasons[fullSeasons.length - 1] ?? "2025-2026")],
    trajectory_summary: projected > lastActual ? "Recovery expected with uploaded data" : "Continued decline",
    change_pct: Number((((projected - lastActual) / lastActual) * 100).toFixed(1)),
  };
}

type OperationalInsight = {
  cost_per_person_day: number;
  total_budget: number;
  participants: number;
  duration: number;
  currency: string;
};

async function postPredict<T>(task: string, payload: object = {}): Promise<T> {
  const res = await fetch(mlEndpoint("/predict"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, payload }),
  });
  const text = await res.text();
  let data: { detail?: unknown; error?: string } & Partial<T>;
  try {
    data = (text ? JSON.parse(text) : {}) as { detail?: unknown; error?: string } & Partial<T>;
  } catch {
    const hint =
      text.trim().startsWith("Internal Server Error") || res.status === 502 || res.status === 504
        ? " The planning service needs to be running."
        : "";
    throw new Error(
      `This plan could not be shown.${hint}`,
    );
  }
  if (!res.ok) {
    const detail = data.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join("; ")
          : data.error ?? "This action could not be completed.";
    throw new Error(msg);
  }
  return data as T;
}

const glassCard = cn(
  "relative overflow-hidden rounded-[6px] border border-red-100",
  "bg-white/80 p-6 shadow-sm backdrop-blur-md",
);

function RunButton({
  loading,
  children,
  onClick,
  disabled,
}: {
  loading: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      onClick={onClick}
      disabled={disabled ?? loading}
      className={cn(
        "rounded-[6px] bg-[#ca0314] px-6 py-5 text-sm font-semibold text-white shadow-sm transition-shadow",
        "hover:bg-[#ca0314]/92 hover:shadow-lg hover:shadow-red-500/20",
        "focus-visible:ring-2 focus-visible:ring-[#ca0314]/35",
      )}
    >
      {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  );
}

function NumberStepper({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  format?: (n: number) => string;
  suffix?: string;
}) {
  const dec = `${step}`.split(".")[1]?.length ?? 0;

  const displayString = format ? format(value) : String(Number(value.toFixed(dec)));
  const [draft, setDraft] = useState(displayString);

  useEffect(() => {
    setDraft(format ? format(value) : String(Number(value.toFixed(dec))));
  }, [value, dec, format]);

  const clampAndCommit = useCallback(
    (raw: string) => {
      const n = Number(String(raw).replace(/,/g, "").trim());
      if (Number.isNaN(n)) {
        setDraft(displayString);
        return;
      }
      const clipped = Number(Math.min(max, Math.max(min, Number(n.toFixed(dec)))).toFixed(dec));
      onChange(clipped);
      setDraft(format ? format(clipped) : String(clipped));
    },
    [displayString, min, max, dec, format, onChange],
  );

  const bump = useCallback(
    (dir: number) => {
      const raw = Number((value + dir * step).toFixed(dec));
      const next = Math.min(max, Math.max(min, raw));
      onChange(next);
      setDraft(format ? format(next) : String(next));
    },
    [value, step, dec, min, max, format, onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#898082]">
        {label}
      </Label>
      <div className="flex items-stretch overflow-hidden rounded-[6px] border border-red-100 bg-white/80 shadow-sm backdrop-blur-md">
        <button
          type="button"
          onClick={() => bump(-1)}
          disabled={value <= min}
          className={cn(
            "flex min-w-11 shrink-0 items-center justify-center border-r border-red-100 bg-white/85 text-[#2a2629]",
            "transition-colors hover:bg-[#faf9f9] disabled:opacity-35",
          )}
          aria-label={`Decrease ${label}`}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <div className="relative flex min-h-11 min-w-[5.75rem] flex-1 items-center justify-center px-2">
          <label htmlFor={id} className="sr-only">
            {label} value
          </label>
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={suffix ? `${draft}` : draft}
            onChange={(e) => setDraft(e.target.value.replace(/\s*%$/, "").replace(/\s*%/g, ""))}
            onBlur={(e) => clampAndCommit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className={cn(
              "w-full bg-transparent py-2 text-center text-sm font-semibold tabular-nums text-[#2a2629]",
              "rounded-[6px] outline-none placeholder:text-[#898082]",
              "ring-1 ring-transparent focus:ring-[#ca0314]/30",
            )}
          />
          {suffix ? (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-[#898082]">
              {suffix}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => bump(1)}
          disabled={value >= max}
          className={cn(
            "flex min-w-11 shrink-0 items-center justify-center border-l border-red-100 bg-white/85 text-[#2a2629]",
            "transition-colors hover:bg-[#faf9f9] disabled:opacity-35",
          )}
          aria-label={`Increase ${label}`}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function StakeholderSelect<V extends number>({
  id,
  label,
  options,
  value,
  onValueChange,
  valueFormatter,
}: {
  id: string;
  label: string;
  options: readonly { readonly label: string; readonly value: V }[];
  value: V;
  onValueChange: (value: V) => void;
  valueFormatter: (value: number) => string;
}) {
  const strValue = valueFormatter(Number(value));
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#898082]">
        {label}
      </Label>
      <Select value={strValue} onValueChange={(s) => onValueChange(Number(s) as V)}>
        <SelectTrigger
          id={id}
          className={cn(
            "h-11 rounded-[6px] border-red-100 bg-white/80 text-[#2a2629]",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-sm hover:bg-white/92",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-[6px] border-red-100 bg-white/95 backdrop-blur-md">
          {options.map((option) => (
            <SelectItem
              key={option.label}
              value={valueFormatter(Number(option.value))}
              className="rounded-[4px]"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ExecutiveCard({
  id,
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn(glassCard, "scroll-mt-24")}>
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-[#efacb2]/8 blur-3xl" />
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-white/30 bg-white/70 text-[#2a2629] shadow-inner">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#898082]">{eyebrow}</p>
            <h2 className="font-display mt-2 text-xl font-semibold tracking-tight text-[#2a2629] md:text-[1.35rem]">
              {title}
            </h2>
          </div>
        </div>
        <div className="rounded-[6px] border border-red-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#898082]">Goal</p>
          <p className="mt-1 text-sm leading-relaxed text-[#2a2629]">{description}</p>
        </div>
        <div className="border-t border-red-100 pt-1">{children}</div>
      </div>
    </section>
  );
}

function LeadershipPulse({ color }: { color: string }) {
  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden>
      <span
        className="absolute h-14 w-14 animate-ping rounded-full"
        style={{ backgroundColor: color, opacity: 0.35 }}
      />
      <span
        className="absolute h-[3.125rem] w-[3.125rem] animate-pulse rounded-full"
        style={{ backgroundColor: color, opacity: 0.55 }}
      />
      <span
        className="relative flex h-[2.7rem] w-[2.7rem] items-center justify-center rounded-full bg-white shadow-[0_10px_32px_-14px_rgba(42,38,41,0.35)]"
        style={{ boxShadow: `0 0 0 3px ${color}, 0 10px 32px -14px rgba(42,38,41,0.35)` }}
      >
        <span className="h-[55%] w-[55%] rounded-full" style={{ backgroundColor: color }} />
      </span>
    </div>
  );
}

function PulseColorsLegend() {
  const items = [
    { color: "#E74C3C", label: "Needs attention" },
    { color: "#F39C12", label: "Balanced posture" },
    { color: "#27AE60", label: "Strong momentum" },
  ];
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-[#898082]">
      {items.map(({ color, label }) => (
        <span key={label} className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

/** 180° radial gauge approximated via Recharts Pie (semi-donut, 180° sweep). */
function ArcGaugeHalf({ pct, accent }: { pct: number; accent: string }) {
  const clamped = Math.round(Math.min(100, Math.max(0, pct)));
  const rest = Math.max(0, 100 - clamped);
  const data = [{ name: "score", value: clamped }, { name: "rest", value: rest }];
  const track = [{ name: "track", value: 100 }];
  const inner = "68%";
  const outer = "98%";

  return (
    <div className="relative mx-auto h-[130px] w-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={track}
            dataKey="value"
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={inner}
            outerRadius={outer}
            fill="#e5e7eb"
            stroke="none"
            isAnimationActive={false}
          />
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={inner}
            outerRadius={outer}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={accent} />
            <Cell fill="transparent" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function OutreachGauge({
  engagementPct,
  visibilityPct,
  views,
  likes,
  comments,
  tier,
  score,
}: {
  engagementPct: number;
  visibilityPct: number;
  views: number;
  likes: number;
  comments: number;
  tier: (typeof PARTICIPATION_TIERS)[number];
  score: number;
}) {
  const roundedScore = Math.round(score);
  const engLabel = `${Math.round(engagementPct)}%`;
  const reachLabel = `${Math.round(visibilityPct)}%`;

  return (
    <div className={cn(glassCard, "p-5")}>
      <div className="relative pt-4">
        <ArcGaugeHalf pct={roundedScore} accent={tier.color} />
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center text-center">
          <p className="font-display text-4xl font-bold tabular-nums tracking-tight text-[#2a2629]">
            {roundedScore}
          </p>
          <p className="mt-1 max-w-[14rem] text-sm font-semibold leading-snug text-[#2a2629]">
            {tier.title}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4 px-2">
        <div>
          <div className="mb-2 flex justify-between text-xs font-semibold text-[#898082]">
            <span className="uppercase tracking-[0.08em]">Engagement</span>
            <span className="tabular-nums text-[#2a2629]">{engLabel}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]/90">
            <div
              className="h-full rounded-full bg-[#ca0314] transition-[width] duration-500"
              style={{ width: `${Math.round(engagementPct)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs font-semibold text-[#898082]">
            <span className="uppercase tracking-[0.08em]">Reach index</span>
            <span className="tabular-nums text-[#2a2629]">{reachLabel}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]/90">
            <div
              className="h-full rounded-full bg-[#2a2629] transition-[width] duration-500"
              style={{ width: `${Math.round(visibilityPct)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        {[
          { label: "Views", value: Math.round(views) },
          { label: "Likes", value: Math.round(likes) },
          { label: "Comments", value: Math.round(comments) },
        ].map((c) => (
          <span
            key={c.label}
            className="rounded-full border border-red-100 bg-white/80 px-3 py-2 text-[11px] font-semibold text-[#2a2629] shadow-sm backdrop-blur-md"
          >
            <span className="mr-2 text-[#898082]">{c.label}</span>
            <span className="tabular-nums">{c.value}</span>
          </span>
        ))}
      </div>

      <p className="mt-6 rounded-[6px] border border-red-100 bg-white/80 px-4 py-3 text-[13px] leading-relaxed text-[#898082] shadow-sm backdrop-blur-md">
        {tier.guidance}
      </p>
    </div>
  );
}

const PARTICIPANT_SCALES = [10, 20, 30, 40, 50] as const;

function BudgetVisual({
  ops,
  categoryLabel,
}: {
  ops: OperationalInsight;
  categoryLabel: string;
}) {
  const nearest =
    PARTICIPANT_SCALES.reduce((best, p) =>
      Math.abs(p - ops.participants) < Math.abs(best - ops.participants) ? p : best,
    PARTICIPANT_SCALES[0]) ?? 10;

  const barData = PARTICIPANT_SCALES.map((p) => {
    const totalCommitment = ops.cost_per_person_day * ops.duration * p;
    return {
      label: String(Math.round(p)),
      totalCommitment: Number(totalCommitment.toFixed(2)),
      raw: totalCommitment,
    };
  });

  const costPerParticipantFullStay = ops.cost_per_person_day * ops.duration;
  const totalRounded = Math.round(ops.total_budget);
  const refY = Number(ops.total_budget.toFixed(2));

  return (
    <div className={cn(glassCard, "p-5")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[6px] border border-red-100 bg-white/80 p-4 shadow-sm backdrop-blur-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#898082]">
            Cost per person
          </p>
          <p className="mt-1 text-[11px] font-medium text-[#898082]">For the full stay</p>
          <p className="font-display mt-3 text-2xl font-bold tabular-nums text-[#2a2629]">
            {Number(costPerParticipantFullStay.toFixed(2))}
            <span className="ml-2 text-sm font-semibold text-[#898082]">{ops.currency}</span>
          </p>
        </div>
        <div className="rounded-[6px] border border-[#ca0314]/15 bg-gradient-to-br from-white/90 to-[#fdf2f2]/80 p-4 shadow-inner">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#898082]">
            Total budget
          </p>
          <p className="font-display mt-3 text-3xl font-bold tabular-nums tracking-tight text-[#2a2629] md:text-4xl">
            {totalRounded}
            <span className="ml-2 inline-block rounded-[6px] border border-red-100 bg-white/90 px-2 py-0.5 align-middle text-xs font-semibold uppercase tracking-[0.12em] text-[#898082]">
              {ops.currency}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-8">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#898082]">
          Budget by participants
        </p>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 8, right: 10, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#e5e7eb" strokeOpacity={0.85} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#898082", fontSize: 11 }}
                axisLine={{ stroke: "#898082", strokeOpacity: 0.3 }}
              />
              <YAxis
                tick={{ fill: "#898082", fontSize: 11 }}
                axisLine={{ stroke: "transparent" }}
                tickFormatter={(v) =>
                  Intl.NumberFormat(undefined, {
                    notation: "compact",
                    maximumFractionDigits: 0,
                  }).format(Number(v))
                }
              />
              <Tooltip
                formatter={(val: number) => [
                  `${Math.round(Number(val))} ${ops.currency}`,
                  "Total budget",
                ]}
                labelFormatter={(l) => `${l} participants`}
                labelStyle={{ fontWeight: 600, color: "#2a2629" }}
                contentStyle={{
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                  background: "rgba(255,255,255,0.97)",
                }}
              />
              <ReferenceLine
                y={refY}
                stroke="#ca0314"
                strokeDasharray="4 4"
                strokeWidth={1.75}
              />
              <Bar dataKey="totalCommitment" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {barData.map((entry) => (
                  <Cell
                    key={entry.label}
                    fill={Number(entry.label) === nearest ? "#ca0314" : "#2a2629"}
                    fillOpacity={Number(entry.label) === nearest ? 1 : 0.22}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-4 text-[12px] text-[#898082]">
        Based on {Math.round(ops.duration)} days · {categoryLabel}.
      </p>
    </div>
  );
}

function StrategicVisual({
  leadersRatio,
  activitiesPerMember,
  femaleParticipationPct,
  activityCount,
  unitMembers,
  tier,
}: {
  leadersRatio: number;
  activitiesPerMember: number;
  femaleParticipationPct: number;
  activityCount: number;
  unitMembers: number;
  tier: (typeof STRATEGIC_TIERS)[number];
}) {
  const vals = [
    Math.min(100, Math.round(leadersRatio * 500)),
    Math.min(100, Math.round(activitiesPerMember * 25)),
    Math.round(femaleParticipationPct),
    Math.min(100, Math.round((activityCount / 20) * 100)),
    Math.min(100, Math.round((unitMembers / 100) * 100)),
  ];

  const radarData = RADAR_SUBJECTS.map((subject, idx) => ({
    subject,
    unit: vals[idx],
    target: GHOST_TARGET_VALUES[idx],
  }));

  return (
    <div className={cn(glassCard, "p-4")}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#898082]">
        Unit health
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 10, right: 28, bottom: 8, left: 28 }}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#898082", fontSize: 10 }} />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fill: "#898082", fontSize: 9 }}
              axisLine={false}
            />
            <Radar
              name="Your unit"
              dataKey="unit"
              stroke={tier.color}
              fill={tier.color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Radar
              name="Objectif"
              dataKey="target"
              stroke="#898082"
              fill="transparent"
              fillOpacity={0}
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            <Legend
              verticalAlign="bottom"
              height={40}
              formatter={(val) => (
                <span className="text-xs font-medium text-[#2a2629]">{val}</span>
              )}
            />
            <Tooltip
              formatter={(val: number) => [`${Math.round(val)}`, ""]}
              labelStyle={{ fontWeight: 600, color: "#2a2629" }}
              contentStyle={{
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                fontSize: 12,
                background: "rgba(255,255,255,0.96)",
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MembershipForecast({
  mem,
  memLoading,
  memError,
  chartRows,
  lastSeasonLabel,
  onRun,
  canManageForecastData,
  forecastDataApplied,
  onUploadData,
  onResetData,
}: {
  mem: MembershipInsight | null;
  memLoading: boolean;
  memError: string | null;
  chartRows: { season: string; members: number }[];
  lastSeasonLabel: string | undefined;
  onRun: () => void;
  canManageForecastData: boolean;
  forecastDataApplied: boolean;
  onUploadData: () => void;
  onResetData: () => void;
}) {
  return (
    <ExecutiveCard
      id="member-forecast"
      eyebrow="Plan 1"
      title="Members"
      description="Shows how many members the group may have next season. This helps prepare recruitment and support."
      icon={Users}
    >
      <div className="mt-1 flex flex-wrap gap-2">
        <RunButton loading={memLoading} onClick={onRun}>
          Show estimate
        </RunButton>
        {canManageForecastData ? (
          <>
            <Button
              type="button"
              size="sm"
              onClick={onUploadData}
              disabled={memLoading}
              className="rounded-[6px] border border-[#ca0314]/20 bg-white px-5 py-5 text-sm font-semibold text-[#ca0314] shadow-sm transition-all hover:border-[#ca0314]/40 hover:bg-[#fff1f2]"
            >
              {memLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="mr-2 h-3.5 w-3.5" />}
              Upload Data
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onResetData}
              disabled={memLoading || !forecastDataApplied}
              className="rounded-[6px] border border-red-100 bg-white px-5 py-5 text-sm font-semibold text-[#2a2629] shadow-sm transition-all hover:border-[#ca0314]/25 hover:bg-[#faf9fa] disabled:opacity-45"
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Reset Data
            </Button>
          </>
        ) : null}
      </div>
      {canManageForecastData && forecastDataApplied ? (
        <p className="rounded-[6px] border border-[#ca0314]/15 bg-[#ca0314]/5 px-3 py-2 text-xs font-medium text-[#ca0314]">
          Added data is now used for this member view.
        </p>
      ) : null}
      {memError ? <p className="text-sm text-red-700">{memError}</p> : null}
      {mem && chartRows.length > 0 ? (
        <div className={cn(glassCard, "p-4")}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-red-100 pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#898082]">
                Direction
              </p>
              <p className="mt-2 text-lg font-semibold text-[#2a2629]">{mem.trajectory_summary}</p>
              <p className="mt-1 text-sm text-[#898082]">
                Change from last season:{" "}
                <span className="font-semibold tabular-nums text-[#2a2629]">
                  {mem.change_pct > 0 ? "+" : ""}
                  {Math.round(Number(mem.change_pct)).toFixed(0)}%
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#898082]">
                Expected members
              </p>
              <p className="font-display mt-1 text-3xl font-bold tabular-nums tracking-tight text-[#ca0314]">
                {Math.round(mem.projected_membership)}
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLine data={chartRows} margin={{ top: 12, right: 14, left: -8, bottom: 4 }}>
                <CartesianGrid stroke="#e5e7eb" strokeOpacity={0.95} vertical={false} />
                <XAxis
                  dataKey="season"
                  tick={{ fill: "#898082", fontSize: 11 }}
                  axisLine={{ stroke: "#898082", strokeOpacity: 0.35 }}
                />
                <YAxis tick={{ fill: "#898082", fontSize: 11 }} axisLine={{ stroke: "transparent" }} />
                <Tooltip
                  formatter={(val: number) => [Math.round(val), "Members"]}
                  labelStyle={{ fontWeight: 600, color: "#2a2629" }}
                  contentStyle={{
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    fontSize: 12,
                    background: "rgba(255,255,255,0.96)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="members"
                  stroke="#2a2629"
                  strokeWidth={2}
                  dot={(dotProps: { cx?: number; cy?: number; payload?: { season: string } }) => {
                    const { cx, cy, payload } = dotProps;
                    if (cx == null || cy == null)
                      return <circle cx={0} cy={0} r={0} fill="none" aria-hidden />;
                    const projected = payload?.season === lastSeasonLabel;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={projected ? 5 : 3.25}
                        fill={projected ? "#ca0314" : "#2a2629"}
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    );
                  }}
                  activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: "#ca0314" }}
                />
              </RechartsLine>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-[11px] text-[#898082]">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#ca0314]" /> Red dot ·
            next season
          </p>
        </div>
      ) : null}
    </ExecutiveCard>
  );
}

function PredictionsPage() {
  const { profile, loading: profileLoading } = useCurrentProfile();
  const [mlReady, setMlReady] = useState<boolean | null>(null);

  const [memLoading, setMemLoading] = useState(false);
  const [memError, setMemError] = useState<string | null>(null);
  const [mem, setMem] = useState<MembershipInsight | null>(null);
  const [baseMem, setBaseMem] = useState<MembershipInsight | null>(null);
  const [forecastDataApplied, setForecastDataApplied] = useState(false);

  const [views, setViews] = useState(1200);
  const [likes, setLikes] = useState(180);
  const [comments, setComments] = useState(42);
  const [visibilityPct, setVisibilityPct] = useState(55);

  const [opsLoading, setOpsLoading] = useState(false);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [ops, setOps] = useState<OperationalInsight | null>(null);
  const [flowValue, setFlowValue] = useState<(typeof FLOW_OPTIONS)[number]["value"]>(1.0);
  const [seasonValue, setSeasonValue] = useState<(typeof SEASON_OPTIONS)[number]["value"]>(2024);
  const [budgetCategoryValue, setBudgetCategoryValue] = useState<
    (typeof BUDGET_SUB_CATEGORY_OPTIONS)[number]["value"]
  >(1.0);
  const [participants, setParticipants] = useState(30);
  const [durationDays, setDurationDays] = useState(3);
  const [budgetMonth, setBudgetMonth] = useState(6);

  const [unitMembers, setUnitMembers] = useState(30);
  const [leadersCount, setLeadersCount] = useState(3);
  const [activitiesPerMember, setActivitiesPerMember] = useState(2);
  const [femaleParticipationPct, setFemaleParticipationPct] = useState(40);
  const [activityCount, setActivityCount] = useState(10);

  const calculatedEngagementPct = views > 0 ? ((likes + comments) / views) * 100 : 0;
  const engagementPct = Math.min(100, Math.max(0, calculatedEngagementPct));
  const leaders_ratio = unitMembers > 0 ? leadersCount / unitMembers : 0;
  const participationTier = deriveParticipationTier(engagementPct, visibilityPct);
  const participationScore = Math.round(engagementPct * 0.6 + visibilityPct * 0.4);
  const strategicTier = deriveStrategicTier(leaders_ratio, activitiesPerMember);

  const selectedCategoryLabel =
    BUDGET_SUB_CATEGORY_OPTIONS.find((o) => o.value === budgetCategoryValue)?.label ?? "Primary category";

  const hasKnownRole = profile.role !== null;
  const showFinanceBudget =
    profile.role === "finance-manager" || profile.role === "group-leader" || (!profileLoading && !hasKnownRole);
  const showUnitModels =
    profile.role === "unit-leader" || profile.role === "group-leader" || (!profileLoading && !hasKnownRole);
  const canManageForecastData = profile.role === "group-leader";
  const visibleModelCount = Number(showUnitModels) * 3 + Number(showFinanceBudget);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(mlEndpoint("/health"));
        setMlReady(res.ok);
      } catch {
        setMlReady(false);
      }
    })();
  }, []);

  const runMembership = useCallback(async (extraRows?: ForecastUploadRow[]) => {
    setMemLoading(true);
    setMemError(null);
    try {
      const data = await postPredict<MembershipInsight>(
        "membership_forecast",
        extraRows ? { extra_membership_data: extraRows } : {},
      );
      setMem(data);
      if (!extraRows?.length) setBaseMem(data);
      setForecastDataApplied(Boolean(extraRows?.length));
    } catch (e) {
      setMemError(e instanceof Error ? e.message : "Unable to load forecast.");
    } finally {
      setMemLoading(false);
    }
  }, []);

  const uploadForecastData = useCallback(async () => {
    setMemLoading(true);
    setMemError(null);
    try {
      const res = await fetch("/data/group-leader-forecast-upload.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`Unable to load upload data (${res.status}).`);
      const doc = (await res.json()) as { rows?: ForecastUploadRow[] };
      const rows = Array.isArray(doc.rows) ? doc.rows : [];
      if (rows.length === 0) throw new Error("Upload data document is empty.");
      const fetchedBaseline =
        baseMem ?? (!forecastDataApplied && mem ? mem : await postPredict<MembershipInsight>("membership_forecast", {}));
      setBaseMem(fetchedBaseline);
      const baseline = fetchedBaseline;
      setMem(applyUploadedForecastData(baseline, rows));
      setForecastDataApplied(true);
    } catch (e) {
      setMemError(e instanceof Error ? e.message : "Unable to upload forecast data.");
    } finally {
      setMemLoading(false);
    }
  }, [baseMem, forecastDataApplied, mem]);

  const resetForecastData = useCallback(async () => {
    setForecastDataApplied(false);
    await runMembership();
  }, [runMembership]);

  const runOperational = useCallback(async () => {
    setOpsLoading(true);
    setOpsError(null);
    try {
      const data = await postPredict<OperationalInsight>("operational_outlook", {
        flowtype: flowValue,
        participants,
        budget_sub_category: budgetCategoryValue,
        budget_month: budgetMonth,
        duration_days: durationDays,
        season: seasonValue,
      });
      setOps(data);
    } catch (e) {
      setOpsError(e instanceof Error ? e.message : "Unable to estimate outlook.");
    } finally {
      setOpsLoading(false);
    }
  }, [flowValue, participants, budgetCategoryValue, budgetMonth, durationDays, seasonValue]);

  const chartRows = useMemo(() => {
    if (!mem) return [];
    return mem.seasons.map((name, i) => ({
      season: name,
      members:
        i >= mem.historical.length ? mem.projected_membership : Math.round(Number(mem.historical[i])),
    }));
  }, [mem]);

  const lastSeasonLabel = mem?.seasons[mem.seasons.length - 1];

  return (
    <div className="relative isolate min-h-[60vh] bg-transparent text-[#2a2629]">
      <div className="relative space-y-10 py-2">
        <header className="overflow-hidden rounded-[6px] border border-[#ca0314]/20 bg-gradient-to-r from-[#a50211] via-[#ca0314] to-[#b00211] p-6 text-white shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/80">
            Planning Space
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white md:text-[2.125rem]">
            Future Trends
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/85 md:text-[0.9375rem]">
            This page shows only what is useful for your role: budget, members, posts, and unit care.
          </p>
          <p className="mt-3 inline-flex rounded-full border border-white/25 bg-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
            {profileLoading ? "Loading your role..." : formatLeadershipRole(profile.role)}
          </p>
          {mlReady === false ? (
            <p className="mt-5 rounded-[6px] border border-red-100 bg-white/80 px-4 py-3 text-sm text-[#898082] shadow-sm backdrop-blur-md">
              The planning service is not available. Please try again in a moment.
            </p>
          ) : null}
        </header>

        <div className={cn("grid gap-8", visibleModelCount === 1 ? "xl:grid-cols-1" : "xl:grid-cols-2")}>
          {showUnitModels ? (
            <MembershipForecast
              mem={mem}
              memLoading={memLoading}
              memError={memError}
              chartRows={chartRows}
              lastSeasonLabel={lastSeasonLabel}
              onRun={() => void runMembership()}
              canManageForecastData={canManageForecastData}
              forecastDataApplied={forecastDataApplied}
              onUploadData={() => void uploadForecastData()}
              onResetData={() => void resetForecastData()}
            />
          ) : null}

          {showUnitModels ? (
          <ExecutiveCard
            id="media-model"
            eyebrow="Plan 2"
            title="Posts"
            description="Shows whether posts are getting enough views, likes, and comments. The result changes as you edit the numbers."
            icon={LineChart}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberStepper
                id="views"
                label="Views"
                value={views}
                onChange={setViews}
                min={0}
                max={1_000_000}
                step={50}
              />
              <NumberStepper
                id="likes"
                label="Likes"
                value={likes}
                onChange={setLikes}
                min={0}
                max={250_000}
                step={10}
              />
              <NumberStepper
                id="comments"
                label="Comments"
                value={comments}
                onChange={setComments}
                min={0}
                max={50_000}
                step={1}
              />
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#898082]">
                  Reaction rate
                </p>
                <div className="flex min-h-11 items-center justify-center rounded-[6px] border border-red-100 bg-white/80 px-4 py-2 shadow-sm backdrop-blur-md">
                  <span className="text-lg font-semibold tabular-nums text-[#2a2629]">
                    {calculatedEngagementPct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <NumberStepper
                id="visibility"
                label="Reach"
                value={visibilityPct}
                onChange={setVisibilityPct}
                min={0}
                max={100}
                step={1}
                suffix="%"
                format={(v) => `${Math.round(v)}`}
              />
            </div>
            <OutreachGauge
              engagementPct={engagementPct}
              visibilityPct={visibilityPct}
              views={views}
              likes={likes}
              comments={comments}
              tier={participationTier}
              score={participationScore}
            />
            <p className="text-[11px] text-[#898082]">The result updates as soon as the numbers change.</p>
          </ExecutiveCard>
          ) : null}

          {showFinanceBudget ? (
          <ExecutiveCard
            id="budget-model"
            eyebrow="Plan 3"
            title="Activity Budget"
            description="Gives a simple budget estimate from the season, category, participants, and duration."
            icon={ArrowUpRight}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <StakeholderSelect
                id="flow-type"
                label="Money type"
                options={FLOW_OPTIONS}
                value={flowValue}
                onValueChange={setFlowValue}
                valueFormatter={(v) => String(v)}
              />
              <StakeholderSelect
                id="season"
                label="Season"
                options={SEASON_OPTIONS}
                value={seasonValue}
                onValueChange={setSeasonValue}
                valueFormatter={(v) => String(v)}
              />
              <div className="sm:col-span-2">
                <StakeholderSelect
                  id="budget-sub-category"
                  label="Category"
                  options={BUDGET_SUB_CATEGORY_OPTIONS}
                  value={budgetCategoryValue}
                  onValueChange={setBudgetCategoryValue}
                  valueFormatter={(v) => String(v)}
                />
              </div>
              <NumberStepper
                id="participants"
                label="Participants"
                value={participants}
                onChange={setParticipants}
                min={1}
                max={500}
                step={1}
              />
              <NumberStepper
                id="duration-days"
                label="Duration (days)"
                value={durationDays}
                onChange={setDurationDays}
                min={1}
                max={30}
                step={1}
              />
              <NumberStepper
                id="budget-month"
                label="Planned month"
                value={budgetMonth}
                onChange={setBudgetMonth}
                min={1}
                max={12}
                step={1}
              />
            </div>
            <div className="mt-2">
              <RunButton loading={opsLoading} onClick={() => void runOperational()}>
                Show budget
              </RunButton>
            </div>
            {opsError ? <p className="text-sm text-red-700">{opsError}</p> : null}
            {ops ? <BudgetVisual ops={ops} categoryLabel={selectedCategoryLabel} /> : null}
          </ExecutiveCard>
          ) : null}

          {showUnitModels ? (
          <ExecutiveCard
            id="unit-model"
            eyebrow="Plan 4"
            title="Unit Care"
            description="Gives a simple view of the unit using members, leaders, activities, and participation."
            icon={Lightbulb}
          >
            <PulseColorsLegend />
            <div className="rounded-[6px] border border-dashed border-red-100 bg-white/80 p-3 shadow-sm backdrop-blur-md">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#898082]">
                Color guide
              </p>
              <div className="space-y-1 text-[11px] text-[#898082]">
                <p>
                  <span className="font-medium text-[#E74C3C]">Red</span> · needs more leaders or activities
                </p>
                <p>
                  <span className="font-medium text-[#F39C12]">Orange</span> · improving
                </p>
                <p>
                  <span className="font-medium text-[#27AE60]">Green</span> · doing well
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberStepper
                id="unit-size"
                label="Total members"
                value={unitMembers}
                onChange={setUnitMembers}
                min={5}
                max={500}
                step={1}
              />
              <NumberStepper
                id="leaders"
                label="Leaders"
                value={leadersCount}
                onChange={setLeadersCount}
                min={1}
                max={100}
                step={1}
              />
              <NumberStepper
                id="activities-per-member"
                label="Activities per member"
                value={activitiesPerMember}
                onChange={setActivitiesPerMember}
                min={0}
                max={120}
                step={1}
              />
              <NumberStepper
                id="female-pct"
                label="Girls joining"
                value={femaleParticipationPct}
                onChange={setFemaleParticipationPct}
                min={0}
                max={100}
                step={1}
                suffix="%"
              />
              <NumberStepper
                id="activity-count"
                label="Total activities"
                value={activityCount}
                onChange={setActivityCount}
                min={0}
                max={500}
                step={1}
              />
              <div className="flex flex-col justify-center rounded-[6px] border border-dashed border-red-100 bg-white/80 px-3 py-2 text-sm shadow-sm backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#898082]">
                  Leader share
                </p>
                <p className="mt-2 font-semibold tabular-nums text-[#2a2629]">
                  {Number.isFinite(leaders_ratio * 100)
                    ? (leaders_ratio * 100).toFixed(2)
                    : "0.00"}
                  %
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-[6px] border border-red-100 bg-white/80 p-4 shadow-sm backdrop-blur-md">
              <LeadershipPulse color={strategicTier.color} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#898082]">
                  Current state
                </p>
                <p className="mt-1 font-semibold text-[#2a2629]">{strategicTier.label}</p>
              </div>
            </div>
            <StrategicVisual
              leadersRatio={leaders_ratio}
              activitiesPerMember={activitiesPerMember}
              femaleParticipationPct={femaleParticipationPct}
              activityCount={activityCount}
              unitMembers={unitMembers}
              tier={strategicTier}
            />
            <p className="text-[11px] text-[#898082]">
              The chart compares your unit with a simple goal.
            </p>
          </ExecutiveCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
