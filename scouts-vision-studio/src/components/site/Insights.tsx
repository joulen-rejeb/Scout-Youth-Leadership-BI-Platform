export function Insights() {
  return (
    <section id="insights" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 mesh-glow opacity-60 pointer-events-none" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-[0.22em] text-stone-warm">Strategic Insights</div>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl text-charcoal leading-[1.1]">
            A quiet glance at the bigger picture.
          </h2>
          <p className="mt-6 text-stone-warm text-lg">
            Subtle indicators, calm visualizations, and moments of clarity — designed
            to inform without overwhelming.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-3 gap-6">
          {/* Card 1 - Trend */}
          <div className="lg:col-span-2 bg-card border border-border rounded-md p-8" style={{ borderRadius: 6 }}>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-stone-warm">Engagement Trend</div>
                <div className="font-display text-3xl text-charcoal mt-2">+18.4%</div>
              </div>
              <div className="text-xs text-stone-warm">Last 6 months</div>
            </div>
            <svg viewBox="0 0 600 160" className="w-full mt-8 h-40">
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.51 0.22 27)" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="oklch(0.51 0.22 27)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,120 C80,100 120,60 180,70 C240,80 280,40 340,50 C400,60 450,30 520,20 L600,15 L600,160 L0,160 Z" fill="url(#g1)" />
              <path d="M0,120 C80,100 120,60 180,70 C240,80 280,40 340,50 C400,60 450,30 520,20 L600,15" fill="none" stroke="oklch(0.225 0.012 350)" strokeWidth="1.5" />
              {[0,100,200,300,400,500,600].map(x=> <circle key={x} cx={x} cy={[120,108,72,68,52,34,15][[0,100,200,300,400,500,600].indexOf(x)]} r="2" fill="oklch(0.51 0.22 27)" />)}
            </svg>
          </div>

          {/* Card 2 - Indicators */}
          <div className="bg-card border border-border rounded-md p-8 flex flex-col justify-between" style={{ borderRadius: 6 }}>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-stone-warm">Operational Health</div>
              <div className="font-display text-3xl text-charcoal mt-2">Stable</div>
            </div>
            <div className="mt-8 space-y-4">
              {[["Units active", 92],["Budget on track", 78],["Activity completion", 86]].map(([l,v])=>(
                <div key={l as string}>
                  <div className="flex justify-between text-xs text-stone-warm"><span>{l}</span><span>{v}%</span></div>
                  <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-charcoal" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 - Donut */}
          <div className="bg-card border border-border rounded-md p-8 flex items-center gap-6" style={{ borderRadius: 6 }}>
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="oklch(0.93 0.012 350)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="oklch(0.51 0.22 27)" strokeWidth="3" strokeDasharray="73 100" pathLength={100} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-display text-charcoal">73%</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-stone-warm">Participation</div>
              <div className="text-charcoal mt-1">Across all units this quarter</div>
            </div>
          </div>

          {/* Card 4 - Indicator chips */}
          <div className="lg:col-span-2 bg-card border border-border rounded-md p-8" style={{ borderRadius: 6 }}>
            <div className="text-xs uppercase tracking-[0.2em] text-stone-warm">Leadership Insights</div>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {[
                ["Coordination", "Improved across 4 units"],
                ["Resource use", "Optimized by 12%"],
                ["Activity planning", "On schedule"],
                ["Family engagement", "Growing steadily"],
              ].map(([t,d])=>(
                <div key={t} className="flex items-start gap-3 p-4 border border-border rounded-md">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-scout-red" />
                  <div>
                    <div className="text-charcoal text-sm">{t}</div>
                    <div className="text-stone-warm text-xs mt-0.5">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
