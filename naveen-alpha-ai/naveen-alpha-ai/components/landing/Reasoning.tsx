"use client";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Counter, Reveal, Section, SectionHead } from "./ui";

const CARDS = [
  { t: "MULTI-STEP REASONING", d: "Break down complex problems, evaluate alternatives and produce structured conclusions.", n: "01" },
  { t: "VISIBLE PROGRESS", d: "Show users what the AI is currently doing through a clean task/progress interface.", n: "02" },
  { t: "PRODUCTION-READY OUTPUT", d: "Generate practical answers, code, reports and structured results.", n: "03" },
];

const STAGES = ["Understanding request", "Analyzing context", "Processing files", "Generating response"];

function StatusDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-80px" });
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!inView) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => (s >= STAGES.length + 2 ? 0 : s + 1)), 1100);
    return () => clearInterval(id);
  }, [inView]);
  const done = step > STAGES.length;
  return (
    <div ref={ref} className="hairline rounded-2xl bg-panel p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-mute">
        <span>Task status</span><span>Interface preview</span>
      </div>
      <ul className="space-y-3.5">
        {STAGES.map((s, i) => {
          const state = done || i < step ? "done" : i === step ? "active" : "idle";
          return (
            <li key={s} className={`flex items-center gap-3 text-[15px] transition-opacity ${state === "idle" ? "opacity-35" : ""}`}>
              <span className="grid h-5 w-5 place-items-center">
                {state === "done" ? <span className="text-accent">✓</span> : state === "active" ? <span className="h-2 w-2 animate-blink rounded-full bg-accent" /> : <span className="h-1.5 w-1.5 rounded-full bg-mute/60" />}
              </span>
              {s}
            </li>
          );
        })}
        <li className={`flex items-center gap-3 text-[15px] font-medium transition-opacity ${done ? "opacity-100" : "opacity-0"}`}><span className="grid h-5 w-5 place-items-center text-accent">✓</span> Completed</li>
      </ul>
      <div className="hairline mt-6 rounded-xl p-4 text-sm leading-relaxed text-mute">
        <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.2em]">Reasoning summary</div>
        Compared three approaches, picked the one that preserves existing behaviour, flagged two assumptions for review.
      </div>
    </div>
  );
}

export function Reasoning() {
  return (
    <Section id="reasoning">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <SectionHead eyebrow="01 — Reasoning" title="Thinks before it answers." sub="Naveen Alpha is designed for structured reasoning, complex analysis and multi-step problem solving. It shows safe summaries of its approach and the stage it is in — never its private scratch work." />
        <Reveal delay={0.1}><StatusDemo /></Reveal>
      </div>
      <div className="hairline mt-16 grid overflow-hidden rounded-2xl md:grid-cols-3">
        {CARDS.map((c, i) => (
          <Reveal key={c.t} delay={i * 0.1} className={`group relative p-7 sm:p-9 ${i > 0 ? "border-t border-line/10 md:border-l md:border-t-0" : ""}`}>
            <div className="font-mono text-xs text-mute">{c.n}</div>
            <h3 className="mt-14 text-[13px] font-semibold tracking-[0.18em]">{c.t}</h3>
            <p className="mt-3 leading-relaxed text-mute">{c.d}</p>
            <div className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-500 group-hover:scale-x-100" />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const SOURCES = [
  { name: "Large codebase", tokens: 412_000, color: "rgb(var(--accent))" },
  { name: "PDF documentation", tokens: 268_576, color: "rgb(var(--fg) / 0.85)" },
  { name: "Meeting transcripts", tokens: 164_000, color: "rgb(var(--fg) / 0.55)" },
  { name: "Technical specifications", tokens: 118_000, color: "rgb(var(--accent) / 0.55)" },
  { name: "Business reports", tokens: 86_000, color: "rgb(var(--fg) / 0.3)" },
];
const TOTAL = 1_048_576;
const CELLS = 288;

export function LongContext() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  let acc = 0;
  const bounds = SOURCES.map((s) => (acc += s.tokens) / TOTAL);
  const colorAt = (i: number) => {
    const f = (i + 1) / CELLS;
    const k = bounds.findIndex((b) => f <= b + 1e-9);
    return SOURCES[k === -1 ? SOURCES.length - 1 : k].color;
  };
  return (
    <Section id="context">
      <SectionHead eyebrow="02 — Long context" title="Bring the whole project." sub="Analyze large documents, specifications, codebases, logs and conversations without constantly losing context." />
      <div ref={ref} className="hairline mt-14 rounded-2xl bg-panel p-5 sm:p-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-5xl font-semibold tracking-tight tabular-nums sm:text-7xl">
              <Counter to={TOTAL} duration={2.6} format={(n) => Math.round(n).toLocaleString("en-US")} />
            </div>
            <div className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-mute">Tokens</div>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">Illustrative example</div>
        </div>

        <div className="mt-8 grid gap-[3px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(14px, 1fr))" }} aria-hidden="true">
          {Array.from({ length: CELLS }).map((_, i) => (
            <span
              key={i}
              className="h-3.5 rounded-[2px] transition-all duration-500"
              style={{
                background: inView ? colorAt(i) : "rgb(var(--line) / 0.07)",
                opacity: inView ? 1 : 0.6,
                transitionDelay: `${(i / CELLS) * 2200}ms`,
              }}
            />
          ))}
        </div>

        <div className="mt-8" role="img" aria-label="Context meter filling to 100 percent">
          <div className="mb-2 flex justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-mute"><span>Context meter</span><span>{inView ? "100%" : "0%"}</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line/10">
            <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: inView ? "100%" : 0 }} transition={{ duration: 2.6, ease: [0.22, 1, 0.36, 1] }} />
          </div>
        </div>

        <ul className="mt-9 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
          {SOURCES.map((s) => (
            <li key={s.name} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: s.color }} />
              <span><span className="block">{s.name}</span><span className="font-mono text-xs text-mute">{s.tokens.toLocaleString("en-US")}</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs text-mute">Actual context length depends on the model configured by the operator.</p>
      </div>
    </Section>
  );
}
