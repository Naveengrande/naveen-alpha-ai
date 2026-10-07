"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Reveal, Section, SectionHead } from "./ui";

/* ---------- BENCHMARKS (demo data, clearly labelled) ---------- */
const BENCH = [
  { k: "Coding", v: [82, 74, 69] },
  { k: "Reasoning", v: [88, 79, 72] },
  { k: "Math", v: [79, 71, 64] },
  { k: "Vision", v: [76, 70, 61] },
  { k: "Long Context", v: [91, 77, 66] },
  { k: "Instruction Following", v: [85, 80, 73] },
];
const SERIES = ["Naveen Alpha", "Baseline A", "Baseline B"];

export function Benchmarks() {
  return (
    <Section id="benchmarks">
      <SectionHead eyebrow="07 — Benchmarks" title="Measured, not claimed." sub="This dashboard shows the layout for verified evaluation results." />
      <Reveal delay={0.1} className="hairline mt-12 rounded-2xl bg-panel p-5 sm:p-9">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-md border border-accent/50 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Demo data — not real results</span>
          <div className="flex gap-4 text-xs text-mute">
            {SERIES.map((s, i) => (<span key={s} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px]" style={{ background: ["rgb(var(--accent))", "rgb(var(--fg) / 0.55)", "rgb(var(--fg) / 0.25)"][i] }} />{s}</span>))}
          </div>
        </div>
        <div className="space-y-6">
          {BENCH.map((b) => (
            <div key={b.k} className="grid items-center gap-2 sm:grid-cols-[170px_1fr] sm:gap-6">
              <div className="text-sm">{b.k}</div>
              <div className="space-y-1.5">
                {b.v.map((v, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-line/10">
                      <motion.div className="h-full rounded-full" style={{ background: ["rgb(var(--accent))", "rgb(var(--fg) / 0.55)", "rgb(var(--fg) / 0.25)"][i] }}
                        initial={{ width: 0 }} whileInView={{ width: `${v}%` }} viewport={{ once: true }} transition={{ duration: 1.2, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }} />
                    </div>
                    <span className="w-8 text-right font-mono text-xs text-mute tabular-nums">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-9 border-t border-line/10 pt-5 text-sm text-mute">Benchmark data will appear here after verified evaluations.</p>
      </Reveal>
    </Section>
  );
}

/* ---------- PROMPT LIBRARY ---------- */
export const PROMPTS: Record<string, string[]> = {
  Coding: ["Analyze this codebase and identify security risks.", "Refactor this function for readability and add unit tests."],
  Reasoning: ["Compare three approaches to this decision and recommend one with trade-offs.", "Find the flaw in this argument step by step."],
  Business: ["Write a one-page strategy memo from these notes.", "Draft a go-to-market plan for a B2B analytics product."],
  Research: ["Summarize the state of the art on this topic and list open questions.", "Create a literature review outline."],
  Writing: ["Turn these rough bullet points into a professional email.", "Rewrite this paragraph to be clearer and shorter."],
  Data: ["Build a Power BI dashboard specification.", "Analyze this CSV and highlight trends and anomalies."],
  Documents: ["Summarize this 300-page document.", "Extract all dates, amounts and obligations from this contract."],
  Images: ["Analyze this image and identify anomalies.", "Describe this chart and the story it tells."],
  Career: ["Review my resume for a senior analytics role.", "Prepare me for a system design interview."],
  Finance: ["Build a simple DCF model structure for this company.", "Explain this balance sheet to a non-finance manager."],
  Risk: ["Create a risk register for this project with likelihood and impact.", "Design key risk indicators for operational risk."],
  "Fraud Analytics": ["Create a fraud investigation report.", "Propose rules and features to detect account takeover."],
};

export function PromptLibrary() {
  const cats = Object.keys(PROMPTS);
  const [cat, setCat] = useState(cats[0]);
  return (
    <Section id="prompts">
      <SectionHead eyebrow="08 — Prompt library" title="Pick a task." />
      <div className="mt-10 flex flex-wrap gap-2" role="tablist" aria-label="Prompt categories">
        {cats.map((c) => (
          <button key={c} role="tab" aria-selected={c === cat} onClick={() => setCat(c)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${c === cat ? "border-fg bg-fg text-ink" : "border-line/15 text-mute hover:text-fg"}`}>{c}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={cat} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }} className="mt-8 grid gap-3 md:grid-cols-2">
          {PROMPTS[cat].map((p) => (
            <Link key={p} href={`/chat?q=${encodeURIComponent(p)}`} className="group flex items-center justify-between gap-4 rounded-2xl border border-line/10 bg-panel p-6 transition-colors hover:border-accent/50">
              <span className="text-lg leading-snug">“{p}”</span>
              <span className="text-mute transition-transform group-hover:translate-x-1 group-hover:text-accent">→</span>
            </Link>
          ))}
        </motion.div>
      </AnimatePresence>
    </Section>
  );
}

/* ---------- HOW IT WORKS ---------- */
const STEPS = ["Describe the task", "AI analyzes the request", "AI processes available context", "AI generates the response", "Review and iterate"];

export function HowItWorks() {
  return (
    <Section id="how">
      <SectionHead eyebrow="09 — How it works" title="Five steps. No ceremony." />
      <div className="relative mt-16 grid gap-10 md:grid-cols-5 md:gap-6">
        <div className="absolute left-[19px] top-2 h-[calc(100%-1rem)] w-px bg-line/10 md:left-0 md:top-[19px] md:h-px md:w-full">
          <motion.div className="h-full w-full origin-top bg-accent md:origin-left" initial={{ scaleY: 0, scaleX: 0 }} whileInView={{ scaleY: 1, scaleX: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 2, ease: "easeInOut" }} />
        </div>
        {STEPS.map((s, i) => (
          <Reveal key={s} delay={i * 0.12} className="relative flex gap-5 md:block">
            <div className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line/20 bg-ink font-mono text-xs">{String(i + 1).padStart(2, "0")}</div>
            <p className="pt-2 text-lg font-medium leading-snug md:mt-6 md:pt-0">{s}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ---------- FAQ ---------- */
const FAQ = [
  ["What is Naveen Alpha AI?", "A reasoning workspace for chatting with AI about code, documents, images and data. You choose from four model profiles; the operator decides which provider and model power each one."],
  ["What can it do?", "Coding help, analysis, writing, document and image understanding, structured output, and multi-step Agent Mode workflows."],
  ["Can I upload documents?", "Yes — PDFs, text, CSV, JSON, Markdown and source code. Text is extracted on the server and passed to the model. Scanned PDFs without a text layer should be uploaded as images."],
  ["Can it analyze images?", "Yes, with vision-capable models (PNG, JPEG, WebP, GIF). Video can be attached, but frame-level analysis depends on the provider."],
  ["Can it write code?", "Yes. Code blocks include syntax highlighting, line numbers, copy and download, plus quick Explain / Optimize / Debug / Rewrite actions."],
  ["Does it support long documents?", "Large inputs are supported up to the limit of the configured model and the server's upload limits. Very large files are truncated with a visible notice."],
  ["Can I use different AI models?", "Yes. The backend has a provider layer for OpenAI, Anthropic, Google and OpenRouter. Map each Naveen model to any provider through environment variables."],
  ["Is it free?", "The software has no built-in billing. Costs come from whichever AI provider API the operator connects."],
  ["How is my data handled?", "Chats and files are sent to the configured model provider to generate replies. By default conversations are kept in your browser's local storage; you can delete them anytime in Settings → Data Controls. See the Privacy panel for the active provider."],
  ["Can I create projects?", "Yes. A project bundles instructions and reference files, and every chat inside it shares that context."],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHead eyebrow="10 — FAQ" title="Questions, answered." />
        <div className="border-t border-line/10">
          {FAQ.map(([q, a], i) => (
            <div key={q} className="border-b border-line/10">
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-6 py-5 text-left text-lg font-medium">
                {q}<span className={`font-mono text-mute transition-transform ${open === i ? "rotate-45" : ""}`}>+</span>
              </button>
              <AnimatePresence initial={false}>
                {open === i && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="pb-6 pr-10 leading-relaxed text-mute">{a}</p></motion.div>)}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------- FINAL CTA + FOOTER ---------- */
export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="grid-bg absolute inset-0 -z-10 opacity-70" />
      <div className="mx-auto max-w-4xl px-5 py-32 text-center sm:px-8 md:py-44">
        <Reveal>
          <h2 className="text-5xl font-semibold leading-[1] tracking-tight sm:text-7xl"><span className="metal">Ready to build with AI?</span></h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-mute">Bring your hardest problem. Let Naveen Alpha work through it.</p>
          <Link href="/chat" className="mt-10 inline-block rounded-xl bg-fg px-8 py-4 text-base font-medium text-ink transition-transform hover:scale-[1.03]">Open Naveen Alpha</Link>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="hairline-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div>
          <Logo />
          <p className="mt-4 text-sm text-mute">Think deeper. Build faster.</p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-mute">
          <a href="#reasoning" className="hover:text-fg">Reasoning</a>
          <a href="#capabilities" className="hover:text-fg">Capabilities</a>
          <a href="#faq" className="hover:text-fg">FAQ</a>
          <Link href="/chat" className="hover:text-fg">Open Chat</Link>
        </div>
        <p className="text-xs text-mute">© 2026 Naveen Alpha AI</p>
      </div>
    </footer>
  );
}
