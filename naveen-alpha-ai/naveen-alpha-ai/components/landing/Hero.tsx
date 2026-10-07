"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import NeuralCanvas from "./NeuralCanvas";
import { Counter, Reveal } from "./ui";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-16">
      <div className="grid-bg absolute inset-0 -z-10" />
      <div className="mx-auto flex min-h-[100dvh] max-w-7xl flex-col items-center px-5 pb-10 pt-20 text-center sm:px-8 md:pt-28">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="hairline mb-8 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-mute">
          <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent" /> Reasoning workspace
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="text-[clamp(2.8rem,9vw,7.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
          <span className="metal">Meet Naveen Alpha.</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
          className="mt-7 max-w-2xl text-base leading-relaxed text-mute sm:text-lg md:text-xl">
          A powerful AI reasoning workspace built for code, complex problems, long-context analysis and intelligent workflows.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Link href="/chat" className="w-full rounded-xl bg-fg px-7 py-3.5 text-center text-[15px] font-medium text-ink transition-transform hover:scale-[1.02] sm:w-auto">Start Chatting</Link>
          <a href="#capabilities" className="hairline w-full rounded-xl px-7 py-3.5 text-center text-[15px] font-medium transition-colors hover:bg-raised sm:w-auto">Explore Capabilities</a>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
          No account required • Fast • Private by design
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4, delay: 0.4 }}
          className="relative mt-6 aspect-[4/3] w-full max-w-3xl flex-1 sm:aspect-[16/10]">
          <NeuralCanvas />
        </motion.div>
      </div>
    </section>
  );
}

const STATS: { value: React.ReactNode; label: string }[] = [
  { value: <><Counter to={1} suffix="M+" /></>, label: "Context Window" },
  { value: <><Counter to={131} suffix="K+" /></>, label: "Maximum Output" },
  { value: <span className="text-2xl leading-tight sm:text-3xl">TEXT + IMAGE + VIDEO</span>, label: "Multimodal Input" },
  { value: <><Counter to={24} suffix="/7" /></>, label: "AI Workspace" },
];

export function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="hairline grid grid-cols-2 overflow-hidden rounded-2xl md:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className={`flex min-h-[150px] flex-col justify-between p-6 sm:p-8 ${i % 2 === 1 ? "border-l border-line/10" : ""} ${i > 0 ? "md:border-l md:border-line/10" : ""} ${i > 1 ? "border-t border-line/10 md:border-t-0" : ""}`}>
            <div className="text-4xl font-semibold tracking-tight sm:text-5xl">{s.value}</div>
            <div className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-mute">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
