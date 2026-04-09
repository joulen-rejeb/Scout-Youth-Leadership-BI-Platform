export function Purpose() {
  const pillars = [
    "Coordination across units",
    "Clarity in decisions",
    "Optimized resource planning",
    "Stronger unit visibility",
    "Efficient leadership",
  ];
  return (
    <section id="platform" className="relative border-t border-red-900/5 bg-transparent py-28 lg:py-36">
      <div className="pointer-events-none absolute left-12 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[#E31B23]/5 blur-3xl" aria-hidden />
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div className="text-xs uppercase tracking-[0.22em] text-[#1A1A1A]/45">Why This Platform Exists</div>
        <h2 className="mt-4 font-display bg-gradient-to-r from-[#1A1A1A] via-[#2a1a1c] to-[#E31B23] bg-clip-text text-4xl leading-[1.1] text-transparent sm:text-5xl">
          A smarter way to support<br /> scout leadership.
        </h2>
        <p className="mt-8 text-lg leading-relaxed text-[#1A1A1A]/62">
          Built for the people who guide our movement. The platform brings together
          the moments, decisions, and resources that shape every unit — quietly, in
          one calm and intelligent space.
        </p>
        <div className="mt-12 flex flex-wrap justify-center gap-3 text-sm text-[#1A1A1A]/70">
          {pillars.map((p, i) => (
            <span key={p} className="inline-flex items-center gap-3 rounded-[6px] border border-white/80 bg-white/65 px-4 py-2 shadow-[0_16px_40px_-34px_rgba(227,27,35,0.65)] backdrop-blur-md">
              {i > 0 && <span className="h-1 w-1 rounded-full bg-[#E31B23]" />}
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
