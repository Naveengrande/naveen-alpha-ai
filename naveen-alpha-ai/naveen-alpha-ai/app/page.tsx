import Navbar from "@/components/landing/Navbar";
import { Hero, Stats } from "@/components/landing/Hero";
import { Reasoning, LongContext } from "@/components/landing/Reasoning";
import { Capabilities } from "@/components/landing/Capabilities";
import { Demo, Multimodal, Agents } from "@/components/landing/Showcase";
import { Benchmarks, PromptLibrary, HowItWorks, Faq, FinalCta, Footer } from "@/components/landing/Lower";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Stats />
      <Reasoning />
      <LongContext />
      <Capabilities />
      <Demo />
      <Multimodal />
      <Agents />
      <Benchmarks />
      <PromptLibrary />
      <HowItWorks />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
