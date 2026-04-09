import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { normalizeLeadershipRole, type LeadershipDashboardRole } from "@/lib/leadership-role";

export const Route = createFileRoute("/workspace/analytics")({
  component: AnalyticsPage,
});

type DashboardKey = LeadershipDashboardRole;

const POWERBI_EMBEDS: Record<
  DashboardKey,
  { title: string; label: string; src: string }
> = {
  "finance-manager": {
    title: "finance",
    label: "Finance",
    src: "https://app.powerbi.com/reportEmbed?reportId=e3104212-0821-4699-9581-02636dfa9170&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730",
  },
  "group-leader": {
    title: "group leader",
    label: "Group Leader",
    src: "https://app.powerbi.com/reportEmbed?reportId=4d99c5cd-1b95-49d8-aa5b-4f17934df9a9&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730",
  },
  "unit-leader": {
    title: "unit leader",
    label: "Unit Leader",
    src: "https://app.powerbi.com/reportEmbed?reportId=1099eea7-8736-47aa-873a-b84780495af4&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730",
  },
};

/**
 * Power BI service chrome (filter pane, page nav tabs). Does not remove visuals drawn on the report canvas
 * (e.g. slicers, custom nav buttons) — those must be hidden in Power BI Desktop or via a bookmark/page layout.
 */
function minimalPowerBiEmbedSrc(embedSrc: string): string {
  try {
    const url = new URL(embedSrc);
    url.searchParams.set("filterPaneEnabled", "false");
    url.searchParams.set("navContentPaneEnabled", "false");
    return url.toString();
  } catch {
    const sep = embedSrc.includes("?") ? "&" : "?";
    return `${embedSrc}${sep}filterPaneEnabled=false&navContentPaneEnabled=false`;
  }
}

function AnalyticsPage() {
  const [phase, setPhase] = useState<"loading" | "ready" | "no-role" | "error">("loading");
  const [dashboardKey, setDashboardKey] = useState<DashboardKey | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

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

        if (profileError) {
          throw profileError;
        }

        const fromProfile = normalizeLeadershipRole(profile?.role ?? null);
        const fromMeta = normalizeLeadershipRole(
          (session.user.user_metadata?.role as string | undefined) ?? null,
        );
        const resolved = fromProfile ?? fromMeta;

        if (!cancelled) {
          if (resolved) {
            setDashboardKey(resolved);
            setPhase("ready");
          } else {
            setPhase("no-role");
          }
        }
      } catch (e) {
        const msg =
          typeof e === "object" && e !== null && "message" in e
            ? String((e as Error).message)
            : "Could not load your profile.";
        if (!cancelled) {
          setPhase("error");
          setErrorDetail(msg);
        }
      }
    }

    void loadRole();
    return () => {
      cancelled = true;
    };
  }, []);

  const embed = dashboardKey ? POWERBI_EMBEDS[dashboardKey] : null;

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-[6px] border border-[#ca0314]/20 bg-gradient-to-r from-[#a50211] via-[#ca0314] to-[#b00211] p-6 text-white shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-white/80">Insights</p>
        <h1 className="mt-2 font-display text-3xl text-white">Analytics</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/85">
          This page shows the numbers that match your role.
        </p>
        {phase === "ready" && embed ? (
          <p className="mt-3 inline-flex rounded-full border border-white/25 bg-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
            Current view: {embed.label}
          </p>
        ) : null}
      </header>

      <section
        className={
          phase === "ready" && embed
            ? "relative"
            : "relative rounded-[6px] border border-red-100 bg-white/80 p-4 shadow-sm backdrop-blur-md sm:p-5"
        }
      >
        {phase === "ready" && embed ? null : (
          <>
            <div className="pointer-events-none absolute -left-16 top-1/3 h-40 w-40 rounded-full bg-[#898082]/30 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 top-0 h-44 w-44 rounded-full bg-[#efacb2]/20 blur-3xl" />
          </>
        )}
        <div
          className={
            phase === "ready" && embed
              ? "relative w-full"
              : "relative rounded-[6px] border border-red-100 bg-white/80 p-3 shadow-sm backdrop-blur-md"
          }
        >
          {phase === "loading" ? (
            <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3 rounded-[6px] border border-dashed border-red-100 bg-white/80 p-8 shadow-sm backdrop-blur-md">
              <Loader2 className="h-8 w-8 animate-spin text-[#ca0314]" aria-hidden />
              <p className="text-sm text-[#898082]">Loading your numbers...</p>
            </div>
          ) : null}

          {phase === "error" ? (
            <div className="flex min-h-[40vh] items-center justify-center rounded-md border border-dashed border-[#ca0314]/30 bg-[#ca0314]/5 p-8">
              <p className="max-w-md text-center text-sm text-[#2a2629]">
                {errorDetail ?? "Something went wrong."}
              </p>
            </div>
          ) : null}

          {phase === "no-role" ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-red-100 bg-white/80 p-8 text-center shadow-sm backdrop-blur-md">
              <p className="text-sm font-medium text-[#2a2629]">No chart for this account yet</p>
              <p className="max-w-md text-sm text-[#898082]">
                Your role is not ready yet. Please ask an admin to check it, then refresh this page.
              </p>
            </div>
          ) : null}

          {phase === "ready" && embed ? (
            <div className="relative -mx-5 w-[calc(100%+2.5rem)] max-w-none overflow-hidden rounded-[6px] border border-red-100 bg-white/80 shadow-sm backdrop-blur-md sm:-mx-8 sm:w-[calc(100%+4rem)]">
              <div className="relative w-full" style={{ paddingBottom: "47.45%" }}>
                <iframe
                  title={embed.title}
                  src={minimalPowerBiEmbedSrc(embed.src)}
                  className="absolute left-0 top-0 box-border h-full w-full border-0 p-0 outline-none ring-0"
                  style={{ border: "none" }}
                  allowFullScreen
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
