"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Reveal, Section, SectionHead } from "./ui";

/* ---------- AI DEMO (real hand-off: opens the live workspace with your prompt) ---------- */
export function Demo() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = (text: string) => router.push(`/chat?q=${encodeURIComponent(text)}`);
  const ideas = ["Review this function for edge cases", "Explain vector databases to a CFO", "Draft a risk assessment outline"];
  return (
    <Section id="demo">
      <SectionHead eyebrow="04 — Try it" title="Ask. Watch it work." sub="Type a task and the live workspace opens with your prompt ready. Responses come from the model your operator configured — nothing here is pre-scripted." />
      <Reveal delay={0.1} className="mt-12">
        <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(q.trim()); }} className="hairline rounded-2xl bg-panel p-3 sm:p-4">
          <label htmlFor="demo-q" className="sr-only">Your prompt</label>
          <textarea id="demo-q" value={q} onChange={(e) => setQ(e.target.value)} rows={3}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (q.trim()) go(q.trim()); } }}
            placeholder="Ask anything, analyze a file, or build something…"
            className="w-full resize-none bg-transparent p-3 text-base outline-none placeholder:text-mute" />
          <div className="flex flex-wrap items-center justify-between gap-3 p-2">
            <div className="flex flex-wrap gap-2">
              {ideas.map((i) => (<button type="button" key={i} onClick={() => go(i)} className="hairline rounded-full px-3 py-1.5 text-xs text-mute transition-colors hover:text-fg">{i}</button>))}
            </div>
            <button type="submit" disabled={!q.trim()} className="rounded-xl bg-fg px-5 py-2.5 text-sm font-medium text-ink transition-opacity disabled:opacity-30">Open in workspace →</button>
          </div>
        </form>
      </Reveal>
    </Section>
  );
}

/* ---------- MULTIMODAL + DOCUMENT PIPELINE ---------- */
const PIPE = ["FILE", "EXTRACT", "UNDERSTAND", "ANALYZE", "ANSWER"];
const ASKS = ["Summarize this", "Find risks", "Extract key numbers", "Compare sections", "Create an executive summary", "Find inconsistencies"];

export function Multimodal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-100px" });
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setStep((s) => (s + 1) % (PIPE.length + 2)), 900);
    return () => clearInterval(id);
  }, [inView]);
  const files = [
    { icon: "PDF", name: "financial_report.pdf", size: "2.8 MB" },
    { icon: "IMG", name: "screenshot.png", size: "1.2 MB" },
    { icon: "CSV", name: "transactions.csv", size: "640 KB" },
  ];
  return (
    <Section id="multimodal">
      <SectionHead eyebrow="05 — Multimodal" title="Drop in the evidence." sub="Images, PDFs, spreadsheets, source code and more. Files are processed server-side and handed to the model as reference data." />
      <div ref={ref} className="mt-14 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal className="hairline rounded-2xl bg-panel p-6">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-mute">Attachment preview</div>
          <div className="space-y-2.5">
            {files.map((f, i) => (
              <motion.div key={f.name} initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 * i }} className="hairline flex items-center gap-3 rounded-xl p-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-raised font-mono text-[10px] text-mute">{f.icon}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm">{f.name}</span><span className="text-xs text-mute">{f.size}</span></span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-accent">Ready</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {ASKS.map((a) => (<Link key={a} href={`/chat?q=${encodeURIComponent(a)}`} className="hairline rounded-full px-3 py-1.5 text-xs text-mute transition-colors hover:text-fg">{a}</Link>))}
          </div>
        </Reveal>
        <Reveal delay={0.1} className="hairline rounded-2xl bg-panel p-6">
          <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-mute">Document pipeline</div>
          <ol className="relative space-y-0">
            {PIPE.map((p, i) => {
              const state = i < step ? "done" : i === step ? "active" : "idle";
              return (
                <li key={p} className="relative flex items-center gap-4 pb-7 last:pb-0">
                  {i < PIPE.length - 1 && <span className="absolute left-[11px] top-6 h-full w-px bg-line/10"><span className="block w-full bg-accent transition-all duration-700" style={{ height: i < step ? "100%" : "0%" }} /></span>}
                  <span className={`relative grid h-6 w-6 place-items-center rounded-full border text-[10px] transition-colors ${state === "idle" ? "border-line/20 text-mute" : "border-accent text-accent"}`}>{state === "done" ? "✓" : i + 1}</span>
                  <span className={`font-mono text-sm tracking-[0.2em] transition-opacity ${state === "idle" ? "opacity-40" : ""}`}>{p}</span>
                </li>
              );
            })}
          </ol>
        </Reveal>
      </div>
    </Section>
  );
}

/* ---------- AGENT MODE ---------- */
const AGENT = ["Goal", "Plan", "Research", "Analysis", "Execution", "Verification", "Final Result"];

export function Agents() {
  const [on, setOn] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setOn((o) => (o >= AGENT.length ? 1 : o + 1)), 1300);
    return () => clearInterval(id);
  }, []);
  return (
    <Section id="agents">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHead eyebrow="06 — Agent mode" title="Let it plan. You stay in control." sub="Agent Mode breaks a goal into stages and runs them one at a time. Pause, resume, stop, or approve each next action. It only produces text — anything outside the chat is a proposal that needs your confirmation." />
          <Reveal delay={0.1}><Link href="/chat?agent=1" className="mt-8 inline-block rounded-xl bg-fg px-6 py-3 text-sm font-medium text-ink">Try Agent Mode</Link></Reveal>
        </div>
        <Reveal delay={0.1} className="hairline rounded-2xl bg-panel p-6">
          <div className="mb-5 flex items-center justify-between"><span className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">Agent mode</span><span className="font-mono text-[11px] text-mute">“Let AI plan and execute a multi-step task.”</span></div>
          <ol className="space-y-2">
            {AGENT.map((s, i) => (
              <li key={s} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all duration-500 ${i < on ? "border-accent/40 bg-accent/5" : "border-line/10 opacity-50"}`}>
                <span><span className="mr-3 font-mono text-xs text-mute">{String(i + 1).padStart(2, "0")}</span>{s}</span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-accent">{i + 1 < on ? "Done" : i + 1 === on ? "Running" : ""}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex gap-2 text-xs text-mute">{["Pause", "Resume", "Stop", "Approve next"].map((b) => <span key={b} className="hairline rounded-lg px-3 py-1.5">{b}</span>)}</div>
        </Reveal>
      </div>
    </Section>
  );
}
