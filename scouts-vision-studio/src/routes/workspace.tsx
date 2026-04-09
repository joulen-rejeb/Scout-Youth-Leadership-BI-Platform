import { createFileRoute, redirect } from "@tanstack/react-router";
import { WorkspaceShell } from "@/components/dashboard/WorkspaceShell";
import { getSupabaseClient } from "@/integrations/supabase/client";

export const Route = createFileRoute("/workspace")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") {
      return;
    }

    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: WorkspaceRoute,
});

function WorkspaceRoute() {
  return <WorkspaceShell />;
}
