import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { getSupabaseClient } from "@/integrations/supabase/client";
import { formatLeadershipRole, type LeadershipDashboardRole } from "@/lib/leadership-role";
import { useCurrentProfile } from "@/lib/use-current-profile";
import { WorkspaceHeaderBrand } from "@/components/site/BrandLockup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  LogOut,
  BarChart3,
  Sparkles,
  LayoutGrid,
  Settings,
  UserCircle2,
  MessagesSquare,
  Gamepad2,
  BadgeDollarSign,
  Megaphone,
  Moon,
  Radar,
  Sun,
  UsersRound,
  X,
} from "lucide-react";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

type WorkspaceUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { to: "/workspace/overview", label: "Home", icon: LayoutGrid },
  { to: "/workspace/analytics", label: "Insights", icon: BarChart3 },
  { to: "/workspace/predictions", label: "Future Trends", icon: Sparkles },
  { to: "/workspace/qa-assistance", label: "ScoutBot", icon: MessagesSquare },
  { to: "/workspace/scouting-game", label: "Scout Game", icon: Gamepad2 },
];

const MODEL_SHORTCUTS: Array<{
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  roles: LeadershipDashboardRole[];
}> = [
  {
    href: "/workspace/predictions#budget-model",
    label: "Budget",
    hint: "Finance",
    icon: BadgeDollarSign,
    roles: ["finance-manager", "group-leader"],
  },
  {
    href: "/workspace/predictions#member-forecast",
    label: "Members",
    hint: "Group",
    icon: UsersRound,
    roles: ["group-leader", "unit-leader"],
  },
  {
    href: "/workspace/predictions#media-model",
    label: "Posts",
    hint: "Reactions",
    icon: Megaphone,
    roles: ["group-leader", "unit-leader"],
  },
  {
    href: "/workspace/predictions#unit-model",
    label: "Unit",
    hint: "Care",
    icon: Radar,
    roles: ["group-leader", "unit-leader"],
  },
];

function TopAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-red-100 bg-white/80 px-3 text-sm text-[#2a2629] shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[#E31B23]/25 hover:shadow-[0_10px_30px_-20px_rgba(227,27,35,0.55)]"
      aria-label={label}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

export function WorkspaceShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useCurrentProfile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("scouts-theme") === "dark" : false,
  );
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("scouts-view-density") === "compact" : false,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("scouts-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem("scouts-view-density", isCompact ? "compact" : "comfortable");
  }, [isCompact]);

  const modelShortcuts = useMemo(() => {
    if (!profile.role) return [];
    return MODEL_SHORTCUTS.filter((item) => item.roles.includes(profile.role));
  }, [profile.role]);

  const canManageUsers = profile.role === "group-leader";

  const loadUsers = useCallback(async () => {
    if (!canManageUsers) return;
    setUsersLoading(true);
    setUsersError(null);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,role,status")
        .order("full_name", { ascending: true });
      if (error) throw error;
      setUsers((data ?? []) as WorkspaceUser[]);
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Unable to load users.");
    } finally {
      setUsersLoading(false);
    }
  }, [canManageUsers]);

  useEffect(() => {
    if (usersOpen) void loadUsers();
  }, [usersOpen, loadUsers]);

  const updateUserStatus = async (userId: string, status: "approved" | "rejected") => {
    setUpdatingUserId(userId);
    setUsersError(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
      if (error) throw error;
      setUsers((rows) => rows.map((row) => (row.id === userId ? { ...row, status } : row)));
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Unable to update this user.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    await navigate({ to: "/login" });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-red-50 to-red-100 text-[#2a2629] transition-colors dark:bg-[radial-gradient(at_top_left,_#24191d,_#171314,_#0f0d0e)] dark:text-white">
      <div className="pointer-events-none fixed inset-0 opacity-100">
        <div className="absolute -right-32 -top-24 h-96 w-96 rounded-full bg-[#E31B23]/5 blur-3xl" />
        <div className="absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-[#E31B23]/5 blur-3xl" />
        <div className="absolute -left-40 bottom-10 h-[24rem] w-[24rem] rounded-full bg-[#E31B23]/5 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col bg-transparent">
        <header className="border-b border-red-100 bg-white/80 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center justify-between">
            <WorkspaceHeaderBrand />
            <div className="flex items-center gap-2">
              <div className="hidden text-right md:block">
                <p className="text-xs font-semibold text-[#2a2629] dark:text-white">{profile.fullName}</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#898082]">
                  {formatLeadershipRole(profile.role)}
                </p>
              </div>
              <TopAction
                icon={<UserCircle2 className="h-4 w-4" />}
                label="Profile"
                onClick={() => setProfileOpen(true)}
              />
              {canManageUsers ? (
                <TopAction
                  icon={<UsersRound className="h-4 w-4" />}
                  label="Users"
                  onClick={() => setUsersOpen(true)}
                />
              ) : null}
              <TopAction
                icon={<Settings className="h-4 w-4" />}
                label="Settings"
                onClick={() => setSettingsOpen(true)}
              />
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-[#ca0314] px-3 text-sm text-white transition-colors hover:bg-[#b00211]"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          <aside
            className={`sticky top-0 min-h-[calc(100vh-73px)] border-r border-red-100 bg-white/95 shadow-[18px_0_60px_-48px_rgba(227,27,35,0.45)] backdrop-blur-2xl transition-all duration-200 ${
              isCollapsed ? "w-[76px]" : "w-[230px]"
            }`}
          >
            <div className="flex justify-end px-3 py-3">
              <button
                type="button"
                onClick={() => setIsCollapsed((value) => !value)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-100 bg-white/80 text-[#2a2629] transition hover:bg-white"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>
            <nav className="space-y-1 px-3 pb-6">
              {ALL_NAV_ITEMS.map((item) => {
                const isActive =
                  location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                const Icon = item.icon;
                return (
                  <div key={item.to}>
                    <Link
                      to={item.to}
                      className={`flex h-10 items-center gap-3 rounded-md border px-3 text-sm transition-all ${
                        isActive
                          ? "border-[#E31B23]/30 bg-[#E31B23]/10 text-[#E31B23]"
                          : "border-transparent text-[#2a2629] hover:border-red-100 hover:bg-white/80"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed ? <span>{item.label}</span> : null}
                    </Link>
                    {item.to === "/workspace/predictions" && modelShortcuts.length > 0 ? (
                      <div className={isCollapsed ? "mt-2 space-y-2" : "ml-4 mt-2 space-y-2 border-l border-[#ca0314]/15 pl-3"}>
                        {modelShortcuts.map((shortcut) => {
                          const ShortcutIcon = shortcut.icon;
                          return (
                            <a
                              key={shortcut.href}
                              href={shortcut.href}
                              className={`group flex items-center gap-2 rounded-xl border border-[#ca0314]/10 bg-gradient-to-br from-white/95 to-[#fff1f2]/85 text-[#2a2629] shadow-[0_14px_35px_-30px_rgba(202,3,20,0.9)] transition-all hover:-translate-y-0.5 hover:border-[#ca0314]/35 hover:shadow-[0_18px_38px_-28px_rgba(202,3,20,0.9)] ${
                                isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2.5"
                              }`}
                              aria-label={shortcut.label}
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#ca0314] text-white transition-transform group-hover:scale-105">
                                <ShortcutIcon className="h-3.5 w-3.5" />
                              </span>
                              {!isCollapsed ? (
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-semibold">{shortcut.label}</span>
                                  <span className="block truncate text-[10px] text-[#898082]">{shortcut.hint}</span>
                                </span>
                              ) : null}
                            </a>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </nav>
          </aside>

          <section className={`relative flex-1 bg-transparent ${isCompact ? "p-4 sm:p-5" : "p-5 sm:p-8"}`}>
            <Outlet />
          </section>
        </div>
      </div>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="overflow-hidden rounded-[6px] border border-red-100 bg-white/95 p-0 text-[#2a2629] shadow-sm backdrop-blur-md">
          <div className="bg-gradient-to-br from-[#ca0314] via-[#a50211] to-[#2a2629] p-6 text-white">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Profile</DialogTitle>
              <DialogDescription className="text-white/75">Your information in the app.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-4 p-6">
            <div className="flex items-center gap-4 rounded-[6px] border border-red-100 bg-white/80 p-4 shadow-sm backdrop-blur-md">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ca0314] text-xl font-semibold text-white">
                {profile.fullName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{profile.fullName}</p>
                <p className="truncate text-sm text-[#898082]">{profile.email ?? "No email available"}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[6px] border border-red-100 bg-white/80 p-4 shadow-sm backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#898082]">Role</p>
                <p className="mt-2 font-semibold">{formatLeadershipRole(profile.role)}</p>
              </div>
              <div className="rounded-[6px] border border-red-100 bg-white/80 p-4 shadow-sm backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#898082]">State</p>
                <p className="mt-2 font-semibold capitalize">{profile.status ?? "active"}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={usersOpen} onOpenChange={setUsersOpen}>
        <DialogContent className="max-w-4xl overflow-hidden border-white/25 bg-white/95 p-0 text-[#2a2629] backdrop-blur-xl">
          <div className="bg-gradient-to-br from-[#ca0314] via-[#a50211] to-[#2a2629] p-6 text-white">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Users</DialogTitle>
              <DialogDescription className="text-white/75">
                Review account requests and choose who can enter the app.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#898082]">
                {users.length} {users.length === 1 ? "user" : "users"} found
              </p>
              <button
                type="button"
                onClick={() => void loadUsers()}
                disabled={usersLoading}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#2a2629] transition hover:border-[#ca0314]/30 hover:bg-[#fff1f2] disabled:opacity-50"
              >
                {usersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UsersRound className="h-4 w-4" />}
                Refresh
              </button>
            </div>

            {usersError ? (
              <div className="mb-4 rounded-md border border-[#ca0314]/20 bg-[#ca0314]/5 px-4 py-3 text-sm text-[#ca0314]">
                {usersError}
              </div>
            ) : null}

            <div className="max-h-[56vh] overflow-auto rounded-xl border border-[#e5e7eb] bg-white/80">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 border-b border-[#e5e7eb] bg-[#fff7f8] text-[11px] uppercase tracking-[0.16em] text-[#898082]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">State</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3e6e8]">
                  {usersLoading && users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-[#898082]">
                        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-[#ca0314]" />
                        Loading users...
                      </td>
                    </tr>
                  ) : null}
                  {!usersLoading && users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-[#898082]">
                        No users found.
                      </td>
                    </tr>
                  ) : null}
                  {users.map((row) => {
                    const isUpdating = updatingUserId === row.id;
                    const status = row.status ?? "pending";
                    return (
                      <tr key={row.id} className="bg-white/60 transition hover:bg-[#fff7f8]">
                        <td className="px-4 py-3 font-medium text-[#2a2629]">
                          {row.full_name || "Unnamed user"}
                        </td>
                        <td className="px-4 py-3 text-[#898082]">{row.email || "No email"}</td>
                        <td className="px-4 py-3 text-[#2a2629]">{row.role || "No role"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                              status === "approved"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : status === "rejected"
                                  ? "border-[#ca0314]/20 bg-[#ca0314]/5 text-[#ca0314]"
                                  : "border-amber-200 bg-amber-50 text-amber-800"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void updateUserStatus(row.id, "approved")}
                              disabled={isUpdating || status === "approved"}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-45"
                            >
                              {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => void updateUserStatus(row.id, "rejected")}
                              disabled={isUpdating || status === "rejected"}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#ca0314]/20 bg-[#ca0314]/5 px-3 text-xs font-semibold text-[#ca0314] transition hover:bg-[#ca0314]/10 disabled:opacity-45"
                            >
                              {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                              Refuse
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="border-white/25 bg-white/90 text-[#2a2629] backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Settings</DialogTitle>
            <DialogDescription>Choose how the app looks for you.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-gradient-to-br from-white to-[#fdf2f2] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2a2629] text-white">
                  {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </span>
                <div>
                  <p className="font-semibold">Soft red theme</p>
                  <p className="text-sm text-[#898082]">{isDark ? "Dark view" : "Light view"}</p>
                </div>
              </div>
              <Switch checked={isDark} onCheckedChange={setIsDark} aria-label="Toggle dark theme" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white/80 p-4">
              <div>
                <p className="font-semibold">Compact view</p>
                <p className="text-sm text-[#898082]">Show more on the screen.</p>
              </div>
              <Switch checked={isCompact} onCheckedChange={setIsCompact} aria-label="Toggle compact view" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
