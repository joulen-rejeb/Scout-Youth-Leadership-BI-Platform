import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, BarChart3, Compass, Sparkles } from "lucide-react";
import scoutAtmosphere from "@/assets/IMG_9988-scaled.jpg";
import { formatLeadershipRole } from "@/lib/leadership-role";
import { useCurrentProfile } from "@/lib/use-current-profile";

export const Route = createFileRoute("/workspace/overview")({
  component: OverviewPage,
});

const quickLinks = [
  {
    title: "Insights",
    description: "See the key numbers for your role.",
    icon: BarChart3,
    to: "/workspace/analytics",
  },
  {
    title: "Future Trends",
    description: "See helpful views for budget, members, posts, and unit care.",
    icon: Sparkles,
    to: "/workspace/predictions",
  },
  {
    title: "Group View",
    description: "Open your charts to follow the group with more clarity.",
    icon: Compass,
    to: "/workspace/analytics",
  },
] as const;

function OverviewPage() {
  const { profile } = useCurrentProfile();

  return (
    <div className="space-y-6">
      <section className="relative flex h-[280px] overflow-hidden rounded-[6px] border border-red-100 bg-white/80 p-7 shadow-sm backdrop-blur-md sm:p-10">
        <img
          src={scoutAtmosphere}
          alt="Scouts atmosphere"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-red-600/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-black/10" />
        <div className="relative mt-auto max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-white/85 drop-shadow-md">Scout Space</p>
          <h1 className="mt-3 font-display text-4xl text-white drop-shadow-md sm:text-5xl">
            Welcome Back, {profile.fullName}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white drop-shadow-md sm:text-base">
            Find the right tools to follow Scouts Grombalia with confidence.
          </p>
          <div className="mt-5 inline-flex rounded-full border border-white/35 bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-sm backdrop-blur-md">
            {formatLeadershipRole(profile.role)}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.to}
              className="group relative overflow-hidden rounded-[6px] border border-red-100 bg-white/80 p-5 shadow-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:border-[#E31B23]/25 hover:shadow-[0_18px_30px_-24px_rgba(227,27,35,0.45)]"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#efacb2]/0 blur-2xl transition-all group-hover:bg-[#efacb2]/45" />
              <div className="relative">
                <div className="mb-6 inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-red-100 bg-white/80">
                  <Icon className="h-4 w-4 text-[#E31B23]" />
                </div>
                <h2 className="text-lg font-medium text-[#2a2629]">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#898082]">{card.description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm text-[#2a2629]">
                  Open <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="rounded-[6px] border border-red-100 bg-white/80 p-5 shadow-sm backdrop-blur-md sm:p-6">
        <h2 className="text-lg font-medium text-[#2a2629]">Latest News</h2>
        <div className="mt-4 grid gap-3 text-sm text-[#898082] md:grid-cols-2">
          <article className="rounded-[6px] border border-red-100 bg-white/80 p-4 backdrop-blur-md">
            <p className="font-medium text-[#2a2629]">Fresh update</p>
            <p className="mt-1">The group information is ready to review.</p>
          </article>
          <article className="rounded-[6px] border border-red-100 bg-white/80 p-4 backdrop-blur-md">
            <p className="font-medium text-[#2a2629]">New plans</p>
            <p className="mt-1">Member and activity views are available.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
