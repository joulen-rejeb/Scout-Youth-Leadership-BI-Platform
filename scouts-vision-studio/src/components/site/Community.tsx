import community from "@/assets/community.jpg";

export function Community() {
  return (
    <section id="vision" className="relative overflow-hidden border-t border-red-900/5 bg-gradient-to-t from-red-100/90 via-red-50/35 to-transparent py-24 lg:py-32">
      <div className="pointer-events-none absolute -left-24 bottom-10 h-96 w-96 rounded-full bg-[#E31B23]/5 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute right-0 top-16 h-80 w-80 rounded-full bg-[#E31B23]/5 blur-3xl" aria-hidden />
      <div className="mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 relative">
          <div className="absolute -inset-4 rounded-[6px] bg-[#E31B23]/10 blur-2xl" />
          <div className="relative aspect-[16/10] overflow-hidden rounded-[6px] border border-white/80 bg-white/65 backdrop-blur-md shadow-[0_24px_80px_-46px_rgba(227,27,35,0.75)]">
            <img
              src={community}
              alt="Scouts gathered together raising hands in unity"
              className="w-full h-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-red-600/30 via-transparent to-white/20" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 via-[#E31B23]/10 to-transparent" />
          </div>
          <div className="absolute -bottom-6 -right-2 max-w-xs rounded-[6px] border border-white/80 bg-white/70 px-5 py-4 backdrop-blur-md shadow-[0_18px_50px_-34px_rgba(227,27,35,0.65)] sm:right-6">
            <div className="text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/45">Together</div>
            <div className="text-sm text-[#1A1A1A] mt-1">Built around the spirit of every scout.</div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="text-xs uppercase tracking-[0.22em] text-[#1A1A1A]/45">Human at heart</div>
          <h2 className="mt-4 font-display bg-gradient-to-r from-[#1A1A1A] via-[#2a1a1c] to-[#E31B23] bg-clip-text text-4xl leading-[1.1] text-transparent sm:text-5xl">
            Technology that<br /> serves the movement.
          </h2>
          <p className="mt-6 text-lg text-[#1A1A1A]/62 leading-relaxed">
            Behind every dashboard and every decision is a community of young
            people, leaders, and families. Our platform is built to honor that —
            empowering leadership while protecting the warmth of the scout spirit.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-6 text-sm">
            {[
              ["Leadership", "Clear direction for every unit"],
              ["Collaboration", "Aligned across the organization"],
              ["Empowerment", "Tools that grow with our youth"],
              ["Growth", "Decisions rooted in insight"],
            ].map(([t, d]) => (
              <div key={t} className="rounded-[6px] border border-white/80 bg-white/65 p-4 backdrop-blur-md shadow-[0_18px_45px_-40px_rgba(227,27,35,0.6)]">
                <div className="text-[#1A1A1A] font-medium">{t}</div>
                <div className="text-[#1A1A1A]/55 mt-1">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
