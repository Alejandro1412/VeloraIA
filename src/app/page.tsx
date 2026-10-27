import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { AgendaStory } from "@/components/landing/AgendaStory";
import { Steps } from "@/components/landing/Steps";
import { Capabilities } from "@/components/landing/Capabilities";
import { DemoSection } from "@/components/landing/DemoSection";
import { RoiCalculator } from "@/components/landing/RoiCalculator";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <SmoothScroll>
      <a href="#demo" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-night focus:px-4 focus:py-2 focus:text-white">
        Ir a la demo
      </a>
      <Nav />
      <main>
        <Hero />
        <AgendaStory />
        <Steps />
        <Capabilities />
        <DemoSection />
        <RoiCalculator />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
