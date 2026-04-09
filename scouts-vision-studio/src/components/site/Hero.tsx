import { Link } from "@tanstack/react-router";
import hero from "@/assets/hero-scout.jpg";
import { ArrowUpRight, TrendingUp, Users } from "lucide-react";

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden border-t border-red-900/5 bg-gradient-to-b from-red-100/85 via-red-50/35 to-transparent pt-32 pb-24 lg:pt-40 lg:pb-32">
      <div className="pointer-events-none absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-[#E31B23]/5 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 top-32 h-[30rem] w-[30rem] rounded-full bg-[#E31B23]/5 blur-3xl" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10 grid lg:grid-cols-12 gap-12 items-center">
        {/* Left */}
        <div className="lg:col-span-6 fade-up">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-red-900/10 bg-white/60 px-4 py-2 text-xs uppercase tracking-[0.22em] text-[#1A1A1A]/55 backdrop-blur-md">
            <span className="h-px w-8 bg-[#E31B23]/70" />
            Strategic Leadership Platform
          </div>
          <h1 className="font-display bg-gradient-to-r from-[#1A1A1A] via-[#2a1a1c] to-[#E31B23] bg-clip-text text-5xl leading-[1.05] text-transparent sm:text-6xl lg:text-7xl">
            Leading Scouts<br />
            Through Vision &amp; Intelligence
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[#1A1A1A]/62">
            An intelligent leadership platform designed to help Scouts Grombalia
            strengthen decision-making, improve operational visibility, and support
            every unit through modern strategic insights.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/login" className="group inline-flex h-12 items-center gap-2 rounded-[6px] bg-[#E31B23] px-6 text-sm text-white shadow-[0_0_20px_rgba(227,27,35,0.4)] transition hover:-translate-y-0.5 hover:bg-[#f02a31]">
              Access Platform
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a href="#vision" className="inline-flex h-12 items-center gap-2 rounded-[6px] border border-red-900/10 bg-white/65 px-6 text-sm text-[#1A1A1A]/75 backdrop-blur-md transition hover:border-[#E31B23]/25 hover:bg-white hover:text-[#E31B23]">
              Explore Vision
            </a>
          </div>

        </div>

        {/* Right - Image */}
        <div className="lg:col-span-6 relative">
          <div className="relative aspect-[4/5] lg:aspect-[5/6]">
            <div className="absolute -inset-4 rounded-[6px] bg-[#E31B23]/10 blur-2xl" />
            <img
              src={hero}
              alt="Tunisian scout giving the scout salute"
              className="absolute inset-0 h-full w-full object-cover hero-mask"
            />
            {/* Soft overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-red-600/30 via-transparent to-white/20 hero-mask pointer-events-none" />

            {/* Floating cards */}
            <div className="hidden sm:block absolute top-6 -left-4 lg:-left-10 rounded-[6px] border border-white/70 bg-white/65 px-4 py-3 backdrop-blur-md float-slow shadow-[0_18px_50px_-30px_rgba(227,27,35,0.45)]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-[6px] bg-[#E31B23]/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-[#E31B23]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#1A1A1A]/45">Vision</div>
                  <div className="text-sm text-[#1A1A1A]">Leadership Vision</div>
                </div>
              </div>
            </div>

            <div className="hidden sm:block absolute bottom-10 -right-2 lg:-right-8 rounded-[6px] border border-white/70 bg-white/65 px-4 py-3 backdrop-blur-md float-slower shadow-[0_18px_50px_-30px_rgba(227,27,35,0.45)]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-[6px] bg-[#E31B23]/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-[#E31B23]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#1A1A1A]/45">Mission</div>
                  <div className="text-sm text-[#1A1A1A]">Stronger Coordination</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
