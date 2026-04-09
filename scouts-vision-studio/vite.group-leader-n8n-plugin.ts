import { createClient } from "@supabase/supabase-js";
import type { Plugin } from "vite";
import { loadEnv } from "vite";

function isGroupLeaderRole(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const n = raw.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-");
  return n === "group-leader" || n === "groupleader";
}

/** Dev-only: GET /api/group-leader/n8n-workflow — Supabase JWT + Group Leader role, then n8n REST API. */
export function groupLeaderN8nWorkflowPlugin(): Plugin {
  return {
    name: "group-leader-n8n-workflow-status",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0] ?? "";
        if (req.method !== "GET" || pathname !== "/api/group-leader/n8n-workflow") {
          next();
          return;
        }

        void (async () => {
          const writeJson = (status: number, body: unknown) => {
            res.statusCode = status;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(body));
          };

          try {
            const env = loadEnv(server.config.mode, server.config.envDir ?? process.cwd(), "");
            const auth = req.headers.authorization;
            if (!auth?.toLowerCase().startsWith("bearer ")) {
              writeJson(401, { ok: false, code: "unauthorized", message: "Missing Authorization bearer token." });
              return;
            }
            const token = auth.slice(7).trim();
            const supabaseUrl = env.VITE_SUPABASE_URL;
            const supabaseAnon = env.VITE_SUPABASE_ANON_KEY;
            if (!supabaseUrl || !supabaseAnon) {
              writeJson(500, { ok: false, code: "server_misconfig", message: "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing." });
              return;
            }

            const supabase = createClient(supabaseUrl, supabaseAnon, {
              auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
              global: { headers: { Authorization: `Bearer ${token}` } },
            });

            const { data: userData, error: userErr } = await supabase.auth.getUser(token);
            if (userErr || !userData.user) {
              writeJson(401, { ok: false, code: "unauthorized", message: "Invalid or expired session." });
              return;
            }

            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", userData.user.id)
              .maybeSingle();

            const metaRole = userData.user.user_metadata?.role as string | undefined;
            if (!isGroupLeaderRole(profile?.role ?? null) && !isGroupLeaderRole(metaRole ?? null)) {
              writeJson(403, { ok: false, code: "forbidden", message: "Group Leader role required." });
              return;
            }

            const n8nKey = env.N8N_API_KEY?.trim();
            const n8nBase = env.N8N_BASE_URL?.trim().replace(/\/+$/, "");
            const n8nWorkflowId = env.N8N_WORKFLOW_ID?.trim();

            if (!n8nKey || !n8nBase || !n8nWorkflowId) {
              writeJson(200, {
                ok: true,
                configured: false,
                message:
                  "Add N8N_BASE_URL, N8N_WORKFLOW_ID, and N8N_API_KEY to scouts-vision-studio/.env (no VITE_ prefix). Restart npm run dev. Create the API key in n8n: Settings → n8n API.",
              });
              return;
            }

            const wfUrl = `${n8nBase}/api/v1/workflows/${encodeURIComponent(n8nWorkflowId)}`;
            const wfRes = await fetch(wfUrl, {
              headers: { "X-N8N-API-KEY": n8nKey, Accept: "application/json" },
            });
            const wfText = await wfRes.text();

            let workflowActive = false;
            let workflowName: string | null = null;
            if (wfRes.ok) {
              try {
                const wf = JSON.parse(wfText) as { active?: boolean; name?: string };
                workflowActive = wf.active === true;
                workflowName = typeof wf.name === "string" ? wf.name : null;
              } catch {
                /* ignore parse */
              }
            }

            const exUrl = `${n8nBase}/api/v1/executions?workflowId=${encodeURIComponent(n8nWorkflowId)}&limit=25`;
            const exRes = await fetch(exUrl, {
              headers: { "X-N8N-API-KEY": n8nKey, Accept: "application/json" },
            });
            const exText = await exRes.text();

            type ExRow = {
              id: string;
              status: string;
              startedAt: string | null;
              stoppedAt: string | null;
              mode: string | null;
            };
            let executions: ExRow[] = [];
            if (exRes.ok) {
              try {
                const ex = JSON.parse(exText) as { data?: unknown[] };
                const rows = Array.isArray(ex.data) ? ex.data : [];
                executions = rows.map((row) => {
                  const r = row as Record<string, unknown>;
                  return {
                    id: String(r.id ?? ""),
                    status: String(r.status ?? (r.finished === true ? "success" : "unknown")),
                    startedAt: typeof r.startedAt === "string" ? r.startedAt : null,
                    stoppedAt: typeof r.stoppedAt === "string" ? r.stoppedAt : null,
                    mode: typeof r.mode === "string" ? r.mode : null,
                  };
                });
              } catch {
                executions = [];
              }
            }

            const n8nReachable = wfRes.status > 0 && wfRes.status < 600;
            let n8nError: string | null = null;
            if (!wfRes.ok) {
              n8nError = `Workflow API HTTP ${wfRes.status}: ${wfText.slice(0, 400)}`;
            } else if (!exRes.ok) {
              n8nError = `Executions API HTTP ${exRes.status}: ${exText.slice(0, 400)}`;
            }

            writeJson(200, {
              ok: true,
              configured: true,
              n8nReachable,
              workflowHttpStatus: wfRes.status,
              executionsHttpStatus: exRes.status,
              workflowActive,
              workflowName,
              executions,
              n8nError,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            writeJson(200, {
              ok: true,
              configured: true,
              n8nReachable: false,
              workflowHttpStatus: 0,
              executionsHttpStatus: 0,
              workflowActive: false,
              workflowName: null,
              executions: [],
              n8nError: msg,
            });
          }
        })();
      });
    },
  };
}
