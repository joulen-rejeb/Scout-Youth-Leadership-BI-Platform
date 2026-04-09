import { Compass, Wallet, Tent } from "lucide-react";

const cards = [
  {
    icon: Compass,
    role: "Group Leader",
    points: ["Strategic overview", "Organizational health", "Leadership visibility", "Operational monitoring"],
  },
  {
    icon: Wallet,
    role: "Finance Manager",
    points: ["Budget planning", "Expense visibility", "Financial optimization", "Resource management"],
  },
  {
    icon: Tent,
    role: "Unit Leader",
    points: ["Participation tracking", "Team management", "Activity monitoring", "Operational support"],
  },
];

export function Stakeholders() {
  return (
    <section id="stakeholders" className="relative border-t border-red-900/5 bg-transparent py-24 lg:py-32">
      <div className="pointer-events-none absolute right-10 top-16 h-80 w-80 rounded-full bg-[#E31B23]/5 blur-3xl" aria-hidden />
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.22em] text-[#1A1A1A]/45">For every leader</div>
          <h2 className="mt-4 font-display bg-gradient-to-r from-[#1A1A1A] via-[#2a1a1c] to-[#E31B23] bg-clip-text text-4xl leading-[1.1] text-transparent sm:text-5xl">
            Designed around the people who lead.
          </h2>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {cards.map(({ icon: Icon, role, points }) => (
            <article
              key={role}
              className="group rounded-[6px] border border-white/80 bg-white/65 p-8 shadow-[0_18px_55px_-42px_rgba(227,27,35,0.55)] backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-[#E31B23]/30 hover:bg-white/80 hover:shadow-[0_24px_70px_-40px_rgba(227,27,35,0.75)]"
            >
              <div className="h-11 w-11 rounded-[6px] border border-[#E31B23]/10 bg-[#E31B23]/5 flex items-center justify-center text-[#E31B23] mb-8 group-hover:border-[#E31B23]/35 transition-colors">
                <Icon className="h-5 w-5" strokeWidth={1.4} />
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/45">Role</div>
              <h3 className="font-display text-2xl text-[#1A1A1A] mt-1.5">{role}</h3>
              <ul className="mt-6 space-y-3">
                {points.map((p) => (
                  <li key={p} className="text-sm text-[#1A1A1A]/62 flex items-start gap-3">
                    <span className="mt-2 h-px w-4 bg-[#E31B23]/70 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
