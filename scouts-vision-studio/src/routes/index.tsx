import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { Purpose } from "@/components/site/Purpose";
import { Stakeholders } from "@/components/site/Stakeholders";
import { Community } from "@/components/site/Community";

import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,_#ffffff_0%,_#fff7f7_42%,_#fee2e2_100%)] text-[#1A1A1A]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-[#E31B23]/5 blur-3xl" />
        <div className="absolute right-[-8rem] top-[28rem] h-96 w-96 rounded-full bg-[#E31B23]/5 blur-3xl" />
        <div className="absolute bottom-32 left-1/4 h-80 w-80 rounded-full bg-[#E31B23]/5 blur-3xl" />
        <div className="absolute bottom-[-8rem] right-1/4 h-[26rem] w-[26rem] rounded-full bg-[#E31B23]/5 blur-3xl" />
      </div>
      <Navbar />
      <main className="relative bg-transparent">
        <Hero />
        <Purpose />
        <Stakeholders />
        <Community />
      </main>
      <Footer />
    </div>
  );
}
