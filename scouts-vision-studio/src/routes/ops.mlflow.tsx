/**
 * Console MLflow autonome (hors workspace) — pas de navigation vers le reste de l’app.
 * URL canonique : /ops/mlflow
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Activity, BarChart3, Database, Layers, RefreshCw, Sigma } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ops/mlflow")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: OpsMlflowConsolePage,
});

/** Main budget training numbers. */
const RF_PIPELINE_METRIC_KEYS = ["test_mae", "test_rmse", "test_r2"] as const;

/** Saved model check numbers. */
const PKL_EVAL_METRIC_KEYS = [
  "eval_kmeans_inertia",
  "eval_kmeans_silhouette",
  "eval_strategic_lr_mean_max_proba",
  "eval_arima_aic",
  "eval_arima_bic",
] as const;

const HIGHLIGHT_METRIC_KEYS = [...RF_PIPELINE_METRIC_KEYS, ...PKL_EVAL_METRIC_KEYS] as const;

type HighlightMetricKey = (typeof HIGHLIGHT_METRIC_KEYS)[number];

const PIPELINE_METRICS_INFO_RF: {
  key: (typeof RF_PIPELINE_METRIC_KEYS)[number];
  sklearnFn: string;
  label: string;
  detail: string;
}[] = [
  {
    key: "test_mae",
    sklearnFn: "sklearn.metrics.mean_absolute_error",
    label: "MAE (test)",
    detail:
      "Average difference between the real value and the shown value. Lower is better.",
  },
  {
    key: "test_rmse",
    sklearnFn: "sqrt(sklearn.metrics.mean_squared_error)",
    label: "RMSE (test)",
    detail:
      "A number that grows when large errors happen. Lower is better.",
  },
  {
    key: "test_r2",
    sklearnFn: "sklearn.metrics.r2_score",
    label: "R² (test)",
    detail:
      "Shows how well the result follows the real values. Higher is better.",
  },
];

const PIPELINE_METRICS_INFO_PKL: {
  key: (typeof PKL_EVAL_METRIC_KEYS)[number];
  sklearnFn: string;
  label: string;
  detail: string;
}[] = [
  {
    key: "eval_kmeans_inertia",
    sklearnFn: "sklearn.cluster.KMeans.inertia_",
    label: "KMeans score",
    detail:
      "Shows how close similar rows are to each other. Lower is better.",
  },
  {
    key: "eval_kmeans_silhouette",
    sklearnFn: "sklearn.metrics.silhouette_score",
    label: "Silhouette KMeans",
    detail:
      "Shows whether groups are well separated. Higher is better.",
  },
  {
    key: "eval_strategic_lr_mean_max_proba",
    sklearnFn: "numpy.mean(numpy.max(LogisticRegression.predict_proba(...), axis=1))",
    label: "Average confidence",
    detail:
      "Shows how confident the saved unit check is. Closer to 1 is stronger.",
  },
  {
    key: "eval_arima_aic",
    sklearnFn: "statsmodels (objet ARIMA / résultats) : attribut .aic",
    label: "AIC ARIMA",
    detail:
      "A saved quality number for the member estimate. Lower is better.",
  },
  {
    key: "eval_arima_bic",
    sklearnFn: "statsmodels : attribut .bic",
    label: "BIC ARIMA",
    detail:
      "Another saved quality number for the member estimate. Lower is better.",
  },
];

const PIPELINE_METRIC_META: Record<
  HighlightMetricKey,
  { sklearnFn: string; label: string; detail: string }
> = {
  ...(Object.fromEntries(PIPELINE_METRICS_INFO_RF.map((r) => [r.key, r])) as Record<
    (typeof RF_PIPELINE_METRIC_KEYS)[number],
    { sklearnFn: string; label: string; detail: string }
  >),
  ...(Object.fromEntries(PIPELINE_METRICS_INFO_PKL.map((r) => [r.key, r])) as Record<
    (typeof PKL_EVAL_METRIC_KEYS)[number],
    { sklearnFn: string; label: string; detail: string }
  >),
};

function apiMl(path: string): string {
  const base = import.meta.env.VITE_SCOUT_ML_URL as string | undefined;
  if (base !== undefined && base !== "") {
    return `${base.replace(/\/$/, "")}${path}`;
  }
  return `/api/ml${path}`;
}

type RunRow = {
  run_id: string;
  run_name: string;
  status: string;
  start_time?: number;
  metrics: Record<string, number>;
  params: Record<string, string>;
};

type ExperimentBlock = {
  experiment_id: string;
  name: string;
  artifact_location: string;
  runs: RunRow[];
};

type RegistryEntry = {
  name: string;
  latest_versions: Array<{
    version: string;
    stage: string;
    run_id: string;
    source: string;
    status: string;
  }>;
};

type OverviewPayload = {
  tracking_uri: string;
  mlops_root?: string;
  mlruns_path: string;
  experiments: ExperimentBlock[];
  model_registry: RegistryEntry[];
};

function formatTime(ms?: number) {
  if (ms == null || Number.isNaN(ms)) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "—";
  }
}

function formatMetricValue(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-4)) {
    return value.toExponential(4);
  }
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 6, useGrouping: false });
}

function pipelineMetricsCards(metrics: Record<string, number>) {
  const keys = HIGHLIGHT_METRIC_KEYS.filter((k) => k in metrics);
  if (keys.length === 0) return <span className="text-sm text-slate-500">—</span>;
  /* Colonne tableau étroite : empiler verticalement (évite chevauchement grid/flex dans <td>). */
  return (
    <div className="flex w-full min-w-[13rem] max-w-[18rem] flex-col gap-2">
      {keys.map((key) => {
        const meta = PIPELINE_METRIC_META[key];
        const isRf = (RF_PIPELINE_METRIC_KEYS as readonly string[]).includes(key);
        return (
          <div
            key={key}
            className={cn(
              "box-border w-full rounded-lg border px-3 py-2.5 shadow-sm",
              isRf ? "border-emerald-500/35 bg-emerald-950/60" : "border-sky-500/35 bg-sky-950/50",
            )}
          >
            <p
              className={cn(
                "text-[10px] font-medium uppercase tracking-wider",
                isRf ? "text-emerald-400" : "text-sky-300",
              )}
            >
              {meta.label}
            </p>
            <p className="mt-1.5 block break-all font-mono text-base font-semibold leading-normal tabular-nums text-white">
              {formatMetricValue(metrics[key])}
            </p>
            <p className="mt-1 font-mono text-[10px] leading-tight text-slate-500">{key}</p>
          </div>
        );
      })}
    </div>
  );
}

function otherMetricsList(metrics: Record<string, number>) {
  const skip = new Set<string>(HIGHLIGHT_METRIC_KEYS);
  const rest = Object.entries(metrics).filter(([k]) => !skip.has(k));
  if (rest.length === 0) return <span className="text-sm text-slate-500">—</span>;
  return (
    <ul className="max-h-32 space-y-1 overflow-y-auto text-xs">
      {rest.map(([k, v]) => (
        <li
          key={k}
          className="flex justify-between gap-2 border-b border-slate-800/80 py-1 last:border-0"
        >
          <span className="font-mono text-slate-400">{k}</span>
          <span className="font-mono tabular-nums text-slate-200">{v}</span>
        </li>
      ))}
    </ul>
  );
}

function OpsMlflowConsolePage() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return "/ops/mlflow";
    return `${window.location.origin}/ops/mlflow`;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiMl("/mlops/overview"));
      const json = (await res.json()) as { detail?: string } & Partial<OverviewPayload>;
      if (!res.ok) {
        throw new Error(typeof json.detail === "string" ? json.detail : `HTTP ${res.status}`);
      }
      setData(json as OverviewPayload);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Unable to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-[#0c0f14] text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(202,3,20,0.12),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(56,189,248,0.06),_transparent_45%)]" />

      <header className="relative border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ca0314] to-[#8b0210] shadow-lg shadow-[#ca0314]/20">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                MLflow workspace
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Runs &amp; model registry
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                This page shows saved model work for the team. It is separate from the main app.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 border-slate-600 bg-slate-900/80 text-slate-100 hover:bg-slate-800"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh data
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        {/* Lien canonique */}
        <section className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2 text-slate-400">
            <Layers className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Page link for internal sharing
            </span>
          </div>
          <p className="mt-3 break-all rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-emerald-300">
            {pageUrl}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Chemin relatif :{" "}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">/ops/mlflow</code> —
            le port dépend de votre serveur de dev (ex. 8080, 8081).
          </p>
        </section>

        {/* Saved training numbers */}
        <section className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sigma className="h-5 w-5 text-[#ca0314]" />
            <h2 className="font-display text-lg font-semibold text-white">
              Saved training numbers
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            File{" "}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-sky-200">
              ml_backend/pipeline/train_pipeline.py
            </code>
            : this file trains and checks the prediction tools, then saves the main results for review.
          </p>

          <h3 className="mt-6 text-sm font-semibold text-emerald-400">
            Block A - Budget training
          </h3>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Formula</th>
                  <th className="px-4 py-3">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {PIPELINE_METRICS_INFO_RF.map((row) => (
                  <tr key={row.key} className="bg-slate-900/30">
                    <td className="px-4 py-3 font-mono text-emerald-300">{row.key}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{row.sklearnFn}</td>
                    <td className="px-4 py-3 text-slate-400">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="mt-6 text-sm font-semibold text-sky-400">
            Block B - Saved model files (run{" "}
            <code className="font-mono text-sky-200">run_metrics_eval_pkl_models</code>)
          </h3>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Formula</th>
                  <th className="px-4 py-3">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {PIPELINE_METRICS_INFO_PKL.map((row) => (
                  <tr key={row.key} className="bg-slate-900/30">
                    <td className="px-4 py-3 font-mono text-sky-300">{row.key}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{row.sklearnFn}</td>
                    <td className="px-4 py-3 text-slate-400">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            Other saved numbers can appear for some runs. They stay in the "Other numbers" column.
          </p>
        </section>

        {loading && !data && !error ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-6 py-12 text-center text-slate-400">
            Loading saved model work...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-5 py-4 text-amber-100">
            <p className="font-semibold text-amber-200">Unable to read MLflow</p>
            <p className="mt-1 text-sm text-amber-100/90">{error}</p>
            <p className="mt-3 text-xs text-amber-200/70">
              Check the planning service, the{" "}
              <code className="rounded bg-black/30 px-1">mlops/mlruns</code> folder, and run{" "}
              <code className="rounded bg-black/30 px-1">npm run ml-train</code> if needed.
            </p>
          </div>
        ) : null}

        {data ? (
          <>
            <section className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-400" />
                <h2 className="font-semibold text-white">Saved work folder</h2>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-1">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Tracking URI</dt>
                  <dd className="mt-1 break-all rounded-lg bg-slate-950 px-3 py-2 font-mono text-xs text-slate-300">
                    {data.tracking_uri}
                  </dd>
                </div>
                {data.mlops_root ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">MLOps folder</dt>
                    <dd className="mt-1 break-all rounded-lg bg-slate-950 px-3 py-2 font-mono text-xs text-slate-300">
                      {data.mlops_root}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">mlruns folder</dt>
                  <dd className="mt-1 break-all rounded-lg bg-slate-950 px-3 py-2 font-mono text-xs text-slate-300">
                    {data.mlruns_path}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="space-y-5">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-white">
                <Activity className="h-5 w-5 text-[#ca0314]" />
                Saved runs
              </h2>
              {data.experiments.length === 0 ? (
                <p className="text-slate-500">No saved run yet.</p>
              ) : (
                data.experiments.map((exp) => (
                  <div
                    key={exp.experiment_id}
                    className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-5 shadow-xl backdrop-blur-sm"
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="text-lg font-semibold text-white">{exp.name}</h3>
                      <span className="text-xs text-slate-500">ID {exp.experiment_id}</span>
                      {exp.name === "scouts_training_pipeline" ? (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                          Training job
                        </span>
                      ) : null}
                    </div>
                    <code className="mt-2 block break-all text-[11px] text-slate-600">
                      {exp.artifact_location}
                    </code>
                    {exp.runs.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-500">No run yet.</p>
                    ) : (
                      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
                        <table className="w-full min-w-[920px] table-fixed text-left text-sm">
                          <thead className="border-b border-slate-800 bg-slate-950/90 text-[11px] uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="w-[14%] px-3 py-3">Run</th>
                              <th className="w-[8%] px-3 py-3">State</th>
                              <th className="w-[12%] px-3 py-3">Start</th>
                              <th className="w-[22%] px-3 py-3">Main numbers</th>
                              <th className="w-[14%] px-3 py-3">Other numbers</th>
                              <th className="w-[30%] px-3 py-3">Settings</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/90">
                            {exp.runs.map((r) => (
                              <tr key={r.run_id} className="align-top bg-slate-900/20">
                                <td className="px-3 py-3 align-top">
                                  <div className="font-medium text-slate-100">
                                    {r.run_name || r.run_id.slice(0, 8)}
                                  </div>
                                  <code className="text-[10px] text-slate-600">{r.run_id}</code>
                                </td>
                                <td className="px-3 py-3 align-top text-slate-400">{r.status}</td>
                                <td className="px-3 py-3 align-top text-xs text-slate-500">
                                  {formatTime(r.start_time)}
                                </td>
                                <td className="px-3 py-3 align-top">
                                  {pipelineMetricsCards(r.metrics)}
                                </td>
                                <td className="px-3 py-3 align-top">
                                  {otherMetricsList(r.metrics)}
                                </td>
                                <td className="px-3 py-3 align-top">
                                  {Object.keys(r.params).length === 0 ? (
                                    <span className="text-slate-600">—</span>
                                  ) : (
                                    <ul className="max-h-28 space-y-1 overflow-y-auto text-[11px]">
                                      {Object.entries(r.params)
                                        .slice(0, 14)
                                        .map(([k, v]) => (
                                          <li key={k} className="text-slate-400">
                                            <span className="text-slate-600">{k}</span>={v}
                                          </li>
                                        ))}
                                    </ul>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </section>

            <section className="space-y-5 pb-16">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-white">
                <Layers className="h-5 w-5 text-sky-400" />
                Saved models
              </h2>
              {data.model_registry.length === 0 ? (
                <p className="text-slate-500">No saved model yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-900/50 shadow-xl backdrop-blur-sm">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="border-b border-slate-800 bg-slate-950/90 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Version</th>
                        <th className="px-4 py-3">Stage</th>
                        <th className="px-4 py-3">Run ID</th>
                        <th className="px-4 py-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {data.model_registry.flatMap((m) => {
                        const vers =
                          m.latest_versions?.length > 0
                            ? m.latest_versions
                            : [
                                {
                                  version: "—",
                                  stage: "—",
                                  run_id: "—",
                                  source: "—",
                                  status: "—",
                                },
                              ];
                        return vers.map((v, i) => (
                          <tr key={`${m.name}-${v.version}-${i}`} className="bg-slate-900/20">
                            <td className="px-4 py-3 font-medium text-slate-100">{m.name}</td>
                            <td className="px-4 py-3 tabular-nums text-slate-300">{v.version}</td>
                            <td className="px-4 py-3 text-slate-400">{v.stage}</td>
                            <td className="px-4 py-3">
                              <code className="break-all text-[10px] text-slate-500">
                                {v.run_id}
                              </code>
                            </td>
                            <td className="px-4 py-3">
                              <code className="break-all text-[10px] text-slate-500">
                                {v.source}
                              </code>
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
