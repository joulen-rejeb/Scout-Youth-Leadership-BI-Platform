import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { isGroupLeaderRole, normalizeLeadershipRole, type LeadershipDashboardRole } from "@/lib/leadership-role";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/group-workflow")({
  beforeLoad: () => {
    throw redirect({ to: "/workspace/overview" });
  },
  component: GroupWorkflowPage,
});

const N8N_EMBED_URL = (import.meta.env.VITE_N8N_GROUP_LEADER_EMBED_URL as string | undefined)?.trim() ?? "";

const POLL_MS = 25_000;

type N8nExecutionRow = {
  id: string;
  status: string;
  startedAt: string | null;
  stoppedAt: string | null;
  mode: string | null;
};

type N8nApiOk =
  | {
      ok: true;
      configured: false;
      message: string;
    }
  | {
      ok: true;
      configured: true;
      n8nReachable: boolean;
      workflowHttpStatus: number;
      executionsHttpStatus: number;
      workflowActive: boolean;
      workflowName: string | null;
      executions: N8nExecutionRow[];
      n8nError: string | null;
    };

type N8nApiErr = {
  ok: false;
  code: string;
  message: string;
};

type N8nApiResponse = N8nApiOk | N8nApiErr;

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function GroupWorkflowPage() {
  const [phase, setPhase] = useState<"loading" | "allowed" | "denied" | "error">("loading");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [role, setRole] = useState<LeadershipDashboardRole | null>(null);

  const [n8nLoading, setN8nLoading] = useState(false);
  const [n8nData, setN8nData] = useState<N8nApiResponse | null>(null);
  const [n8nFetchError, setN8nFetchError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        const userId = session?.user?.id;
        if (!userId) {
          if (!cancelled) {
            setPhase("error");
            setErrorDetail("No active session.");
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) throw profileError;

        const resolved =
          normalizeLeadershipRole(profile?.role ?? null) ??
          normalizeLeadershipRole((session.user.user_metadata?.role as string | undefined) ?? null);

        if (!cancelled) {
          setRole(resolved);
          if (isGroupLeaderRole(resolved)) setPhase("allowed");
          else setPhase("denied");
        }
      } catch (e) {
        const msg =
          typeof e === "object" && e !== null && "message" in e ? String((e as Error).message) : "Could not verify access.";
        if (!cancelled) {
          setPhase("error");
          setErrorDetail(msg);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchN8nStatus = useCallback(async () => {
    setN8nLoading(true);
    setN8nFetchError(null);
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setN8nFetchError("No session token.");
        setN8nLoading(false);
        return;
      }

      const res = await fetch("/api/group-leader/n8n-workflow", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404) {
        setN8nData(null);
        setN8nFetchError(
          "Status API not found. This n8n bridge runs on the Vite dev server only — use npm run dev, or add the same route to your production host.",
        );
        setN8nLoading(false);
        return;
      }

      const json = (await res.json()) as N8nApiResponse;
      if (!res.ok && json && typeof json === "object" && "ok" in json && json.ok === false) {
        setN8nData(null);
        setN8nFetchError((json as N8nApiErr).message ?? `HTTP ${res.status}`);
        setN8nLoading(false);
        return;
      }

      setN8nData(json);
      setLastRefresh(new Date());
    } catch (e) {
      setN8nFetchError(e instanceof Error ? e.message : "Network error");
      setN8nData(null);
    } finally {
      setN8nLoading(false);
    }
  }, []);

  useEffect(() => {
    if (phase !== "allowed") return;

    void fetchN8nStatus();
    const id = window.setInterval(() => void fetchN8nStatus(), POLL_MS);
    return () => window.clearInterval(id);
  }, [phase, fetchN8nStatus]);

  return (
    <div className="space-y-5">
      <header className="rounded-md border border-[#e5e7eb] bg-white/70 p-6 backdrop-blur-md">
        <p className="text-xs uppercase tracking-[0.2em] text-[#898082]">Automation</p>
        <h1 className="mt-2 font-display text-3xl text-[#2a2629]">Group Leader workflow</h1>
        <p className="mt-3 max-w-3xl text-sm text-[#898082]">
          Live view of your n8n workflow: <strong className="text-[#2a2629]">activation</strong> in n8n, whether the API is
          reachable, and each recent <strong className="text-[#2a2629]">execution</strong> (success, error, running, etc.).
          Refreshes automatically every {POLL_MS / 1000}s while this page is open.
        </p>
      </header>

      {phase === "loading" ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-[#e5e7eb] bg-white/60 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#ca0314]" aria-hidden />
          <p className="text-sm text-[#898082]">Checking your access…</p>
        </div>
      ) : null}

      {phase === "error" ? (
        <div className="rounded-md border border-[#ca0314]/25 bg-[#ca0314]/5 p-6 text-sm text-[#2a2629]">
          {errorDetail ?? "Something went wrong."}
        </div>
      ) : null}

      {phase === "denied" ? (
        <div className="rounded-md border border-[#e5e7eb] bg-white/80 p-8 text-center">
          <p className="text-base font-medium text-[#2a2629]">Access restricted</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#898082]">
            Your role is
            {role ? (
              <>
                {" "}
                <span className="font-medium text-[#2a2629]">{role}</span>
              </>
            ) : (
              " not set as Group Leader"
            )}
            . Only users with the <strong>Group Leader</strong> role can open this page.
          </p>
          <Link
            to="/workspace/overview"
            className="mt-6 inline-block rounded-md bg-[#ca0314] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#b00211]"
          >
            Back to Overview
          </Link>
        </div>
      ) : null}

      {phase === "allowed" ? (
        <>
          <section className="rounded-xl border border-[#e5e7eb] bg-white/90 p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-[#2a2629]">Workflow status</h2>
                <p className="mt-1 text-xs text-[#898082]">
                  Data comes from the n8n REST API (server-side in dev). Configure{" "}
                  <code className="rounded bg-[#f3f1f2] px-1 py-0.5 text-[10px]">N8N_BASE_URL</code>,{" "}
                  <code className="rounded bg-[#f3f1f2] px-1 py-0.5 text-[10px]">N8N_WORKFLOW_ID</code>,{" "}
                  <code className="rounded bg-[#f3f1f2] px-1 py-0.5 text-[10px]">N8N_API_KEY</code> in{" "}
                  <code className="rounded bg-[#f3f1f2] px-1 py-0.5 text-[10px]">.env</code> (not exposed to the browser).
                </p>
              </div>
              <div className="flex items-center gap-2">
                {lastRefresh ? (
                  <span className="text-xs text-[#898082]">
                    Updated {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => void fetchN8nStatus()}
                  disabled={n8nLoading}
                  className="inline-flex items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#2a2629] transition hover:border-[#ca0314]/35 hover:bg-[#fdf2f2] disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-4 w-4", n8nLoading && "animate-spin")} aria-hidden />
                  Refresh
                </button>
              </div>
            </div>

            {n8nFetchError ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{n8nFetchError}</div>
            ) : null}

            {n8nData && n8nData.ok && !n8nData.configured ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="font-medium">n8n API not configured</p>
                <p className="mt-1 text-amber-900/90">{n8nData.message}</p>
              </div>
            ) : null}

            {n8nData && n8nData.ok && n8nData.configured ? (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                      n8nData.n8nReachable && !n8nData.n8nError
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-red-200 bg-red-50 text-red-800",
                    )}
                  >
                    API: {n8nData.n8nReachable && !n8nData.n8nError ? "OK" : "Down / error"}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                      n8nData.workflowActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-stone-200 bg-stone-100 text-stone-700",
                    )}
                  >
                    Workflow: {n8nData.workflowActive ? "Active" : "Inactive"}
                  </span>
                  {n8nData.workflowName ? (
                    <span className="inline-flex items-center rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-xs font-medium text-[#2a2629]">
                      {n8nData.workflowName}
                    </span>
                  ) : null}
                </div>

                {n8nData.n8nError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 font-mono text-xs text-red-900 whitespace-pre-wrap break-all">
                    {n8nData.n8nError}
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-[#e5e7eb] bg-[#faf9fa] text-xs uppercase tracking-wide text-[#898082]">
                      <tr>
                        <th className="px-3 py-2 font-medium">Started</th>
                        <th className="px-3 py-2 font-medium">Finished</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Mode</th>
                        <th className="px-3 py-2 font-medium">ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {n8nData.executions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-[#898082]">
                            No executions returned yet (or none for this workflow).
                          </td>
                        </tr>
                      ) : (
                        n8nData.executions.map((row, i) => (
                          <tr
                            key={row.id ? `ex-${row.id}` : `ex-row-${i}`}
                            className="border-b border-[#f3f1f2] last:border-0"
                          >
                            <td className="px-3 py-2.5 text-[#2a2629] tabular-nums">{formatWhen(row.startedAt)}</td>
                            <td className="px-3 py-2.5 text-[#898082] tabular-nums">{formatWhen(row.stoppedAt)}</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={cn(
                                  "rounded-md px-2 py-0.5 text-xs font-medium",
                                  row.status === "success" && "bg-emerald-100 text-emerald-800",
                                  row.status === "error" && "bg-red-100 text-red-800",
                                  row.status === "running" && "bg-amber-100 text-amber-900",
                                  row.status === "waiting" && "bg-sky-100 text-sky-900",
                                  row.status === "canceled" && "bg-stone-200 text-stone-800",
                                  !["success", "error", "running", "waiting", "canceled"].includes(row.status) &&
                                    "bg-[#f3f1f2] text-[#2a2629]",
                                )}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-[#898082]">{row.mode ?? "—"}</td>
                            <td className="max-w-[120px] truncate px-3 py-2.5 font-mono text-xs text-[#898082]" title={row.id}>
                              {row.id || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {!n8nData && !n8nFetchError && n8nLoading ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-[#898082]">
                <Loader2 className="h-4 w-4 animate-spin text-[#ca0314]" aria-hidden />
                Loading n8n status…
              </div>
            ) : null}
          </section>

          {N8N_EMBED_URL ? (
            <section className="relative overflow-hidden rounded-xl border border-[#e5e7eb] bg-white">
              <h2 className="border-b border-[#e5e7eb] px-4 py-3 text-sm font-medium text-[#2a2629]">Embedded tool</h2>
              <div className="relative h-[min(70vh,560px)] w-full">
                <iframe
                  title="Group Leader n8n workflow"
                  src={N8N_EMBED_URL}
                  className="h-full w-full border-0"
                  style={{ border: "none" }}
                  allow="clipboard-write"
                />
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
