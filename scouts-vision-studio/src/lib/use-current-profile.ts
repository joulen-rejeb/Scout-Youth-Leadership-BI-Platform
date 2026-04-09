import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { normalizeLeadershipRole, type LeadershipDashboardRole } from "@/lib/leadership-role";

export type CurrentProfile = {
  id: string | null;
  email: string | null;
  fullName: string;
  role: LeadershipDashboardRole | null;
  status: string | null;
};

const fallbackProfile: CurrentProfile = {
  id: null,
  email: null,
  fullName: "Scout leader",
  role: null,
  status: null,
};

function metadataString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function useCurrentProfile() {
  const [profile, setProfile] = useState<CurrentProfile>(fallbackProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user;
        if (!user) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: row } = await supabase
          .from("profiles")
          .select("full_name,email,role,status")
          .eq("id", user.id)
          .maybeSingle();

        const metadata = user.user_metadata ?? {};
        const fullName =
          metadataString(row?.full_name) ??
          metadataString(metadata.full_name) ??
          metadataString(metadata.name) ??
          user.email?.split("@")[0] ??
          "Scout leader";

        const role =
          normalizeLeadershipRole(row?.role ?? null) ??
          normalizeLeadershipRole(metadataString(metadata.role));

        if (!cancelled) {
          setProfile({
            id: user.id,
            email: metadataString(row?.email) ?? user.email ?? null,
            fullName,
            role,
            status: metadataString(row?.status),
          });
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading };
}
