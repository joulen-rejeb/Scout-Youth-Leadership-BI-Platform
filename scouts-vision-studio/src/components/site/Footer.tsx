import emblem from "@/assets/emblem-outline.png";
import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer id="contact" className="relative bg-red-100/35 pt-24 pb-10 overflow-hidden border-t border-red-900/5">
      <div className="pointer-events-none absolute left-1/4 top-10 h-72 w-72 rounded-full bg-[#E31B23]/5 blur-3xl" aria-hidden />
      <img
        src={emblem}
        alt=""
        aria-hidden
        className="pointer-events-none select-none absolute -right-20 -bottom-24 w-[460px] opacity-[0.05]"
      />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[#1A1A1A]/45">Scouts Grombalia</div>
            <div className="mt-3 font-display max-w-md bg-gradient-to-r from-[#1A1A1A] via-[#2a1a1c] to-[#E31B23] bg-clip-text text-3xl leading-tight text-transparent">
              Decision Support System for a movement that leads with vision.
            </div>
          </div>
          <div className="lg:col-span-7 grid sm:grid-cols-3 gap-8 text-sm">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/45 mb-4">Platform</div>
              <ul className="space-y-2 text-[#1A1A1A]/60">
                <li><a href="#vision" className="hover:text-[#E31B23]">Vision</a></li>
                <li><a href="#stakeholders" className="hover:text-[#E31B23]">Stakeholders</a></li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/45 mb-4">Organization</div>
              <ul className="space-y-2 text-[#1A1A1A]/60">
                <li><a href="#" className="hover:text-[#E31B23]">Partners</a></li>
                <li><a href="#contact" className="hover:text-[#E31B23]">Contact</a></li>
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/45 mb-4">Access</div>
              <ul className="space-y-2 text-[#1A1A1A]/60">
                <li>
                  <Link to="/login" className="hover:text-[#E31B23]">
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="hover:text-[#E31B23]">
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t border-red-900/5 flex flex-wrap items-center justify-between gap-4 text-xs text-[#1A1A1A]/45">
          <div>© {new Date().getFullYear()} Scouts Grombalia. All rights reserved.</div>
          <div className="tracking-[0.2em] uppercase">Always Prepared · دائما مستعد</div>
        </div>
      </div>
    </footer>
  );
}
