import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LandingNavbarBrand } from "@/components/site/BrandLockup";

const links = [
  { label: "Home", href: "#home" },
  { label: "Stakeholders", href: "#stakeholders" },
  { label: "Vision", href: "#vision" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/75 backdrop-blur-xl border-b border-red-900/10 shadow-[0_10px_40px_-28px_rgba(227,27,35,0.35)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center justify-between">
        <LandingNavbarBrand />

        <nav className="hidden md:flex items-center gap-9">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-[#1A1A1A]/70 hover:text-[#E31B23] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden sm:inline-flex h-9 items-center rounded-[6px] border border-red-900/10 bg-white/60 px-4 text-sm text-[#1A1A1A]/75 backdrop-blur-md transition-colors hover:border-[#E31B23]/25 hover:bg-white hover:text-[#E31B23]"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-9 items-center rounded-[6px] bg-[#E31B23] px-4 text-sm text-white shadow-[0_0_20px_rgba(227,27,35,0.4)] transition hover:-translate-y-0.5 hover:bg-[#f02a31]"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
}
