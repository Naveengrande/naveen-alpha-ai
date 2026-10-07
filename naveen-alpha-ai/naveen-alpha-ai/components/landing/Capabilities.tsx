"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Reveal, Section, SectionHead } from "./ui";

const S = { stroke: "currentColor", strokeWidth: 1.5, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const loop = (d = 0, dur = 2.4) => ({ duration: dur, repeat: Infinity, ease: "easeInOut" as const, delay: d });

const Icons = {
  code: () => (
    <svg viewBox="0 0 48 48" className="h-full w-full"><path d="M18 14 8 24l10 10M30 14l10 10-10 10" {...S} /><motion.path d="M22 33h6" {...S} animate={{ opacity: [1, 0, 1] }} transition={loop(0, 1.2)} /></svg>
  ),
  vision: () => (
    <svg viewBox="0 0 48 48" className="h-full w-full"><path d="M4 24s7-12 20-12 20 12 20 12-7 12-20 12S4 24 4 24Z" {...S} /><circle cx="24" cy="24" r="5" {...S} /><motion.path d="M8 24h32" {...S} strokeOpacity={0.5} animate={{ y: [-9, 9, -9] }} transition={loop(0, 3)} /></svg>
  ),
  doc: () => (
    <svg viewBox="0 0 48 48" className="h-full w-full"><path d="M12 5h17l8 8v30H12Z" {...S} />{[22, 28, 34].map((y, i) => (<motion.path key={y} d={`M17 ${y}h14`} {...S} initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1, 0] }} transition={loop(i * 0.25, 3)} />))}</svg>
  ),
  agent: () => (
    <svg viewBox="0 0 48 48" className="h-full w-full"><path d="M10 34 24 12l14 22M10 34h28" {...S} strokeOpacity={0.6} />{[[10, 34], [24, 12], [38, 34]].map(([x, y], i) => (<motion.circle key={i} cx={x} cy={y} r="3.5" {...S} animate={{ scale: [1, 1.25, 1] }} style={{ transformOrigin: `${x}px ${y}px` }} transition={loop(i * 0.5)} />))}<motion.circle r="2" fill="currentColor" animate={{ cx: [10, 24, 38, 10], cy: [34, 12, 34, 34] }} transition={{ duration: 3.4, repeat: Infinity, ease: "linear" }} /></svg>
  ),
  struct: () => (
    <svg viewBox="0 0 48 48" className="h-full w-full"><path d="M16 8c-5 0-5 4-5 8s-2 6-5 8c3 2 5 4 5 8s0 8 5 8M32 8c5 0 5 4 5 8s2 6 5 8c-3 2-5 4-5 8s0 8-5 8" {...S} />{[20, 24, 28].map((y, i) => (<motion.path key={y} d={`M20 ${y}h8`} {...S} animate={{ opacity: [0.2, 1, 0.2] }} transition={loop(i * 0.3, 1.8)} />))}</svg>
  ),
  reason: () => (
    <svg viewBox="0 0 48 48" className="h-full w-full"><path d="M24 40V26M24 26 12 14M24 26l12-12M12 14V8M36 14V8M24 26V8" {...S} strokeOpacity={0.6} />{[[24, 40], [12, 8], [24, 8], [36, 8]].map(([x, y], i) => (<motion.circle key={i} cx={x} cy={y} r="3" fill="currentColor" animate={{ opacity: [0.3, 1, 0.3] }} transition={loop(i * 0.35, 2)} />))}</svg>
  ),
  write: () => (
    <svg viewBox="0 0 48 48" className="h-full w-full"><motion.path d="M6 38c6-10 10 4 14-6s6-12 10-4 6 6 12-2" {...S} animate={{ pathLength: [0, 1, 1] }} transition={loop(0, 3.2)} /><path d="m32 8 8 8-18 18-9 1 1-9Z" {...S} /></svg>
  ),
  data: () => (
    <svg viewBox="0 0 48 48" className="h-full w-full"><path d="M6 42h36" {...S} />{[10, 20, 30].map((x, i) => (<motion.rect key={x} x={x} width="7" rx="1" {...S} animate={{ y: [42, 42 - [14, 24, 32][i], 42 - [14, 24, 32][i]], height: [0, [14, 24, 32][i], [14, 24, 32][i]] }} transition={loop(i * 0.2, 3)} />))}</svg>
  ),
};

const CAPS: { t: string; d: string; more: string; icon: keyof typeof Icons }[] = [
  { t: "LONG-HORIZON CODING", d: "Debug, refactor and understand large software projects.", more: "Upload source files, ask for refactors, test plans, migrations or root-cause analysis. Responses include syntax-highlighted code you can copy or download.", icon: "code" },
  { t: "VISION", d: "Analyze screenshots, diagrams, charts and images.", more: "Attach images from your camera, photos or files. Works with vision-capable models configured on the server.", icon: "vision" },
  { t: "DOCUMENT ANALYSIS", d: "Upload PDFs and documents and extract insights.", more: "Text is extracted server-side from PDFs, CSV, JSON, Markdown and code, then passed to the model as reference data.", icon: "doc" },
  { t: "AGENT WORKFLOWS", d: "Design and execute multi-step AI workflows.", more: "Agent Mode plans a goal, then runs each stage with pause, resume, stop and approval gates between steps.", icon: "agent" },
  { t: "STRUCTURED OUTPUT", d: "Generate JSON, tables, reports and structured responses.", more: "Ask for schemas, tables or reports. The backend also exposes a structured-output method on every provider.", icon: "struct" },
  { t: "DEEP REASONING", d: "Solve complex mathematical, logical and analytical problems.", more: "Pick the Advanced Reasoning model for multi-step problems. You get a concise reasoning summary, not raw scratch work.", icon: "reason" },
  { t: "WRITING", d: "Transform rough ideas into professional documents.", more: "Turn notes into memos, briefs, emails and reports; iterate with Edit prompt, Regenerate and Continue.", icon: "write" },
  { t: "DATA ANALYSIS", d: "Analyze datasets, identify trends and generate conclusions.", more: "Upload CSV or JSON, then ask for summaries, anomalies, trends and next steps. Large files are truncated with a visible notice.", icon: "data" },
];

function Card({ c, i }: { c: (typeof CAPS)[number]; i: number }) {
  const [open, setOpen] = useState(false);
  const Icon = Icons[c.icon];
  return (
    <Reveal delay={(i % 4) * 0.07}>
      <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="group relative h-full overflow-hidden rounded-2xl border border-line/10 bg-panel p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/0 blur-3xl transition-all duration-500 group-hover:bg-accent/15" />
        <div className="h-11 w-11 text-fg transition-colors group-hover:text-accent"><Icon /></div>
        <h3 className="mt-8 text-[12px] font-semibold tracking-[0.18em]">{c.t}</h3>
        <p className="mt-2.5 text-[15px] leading-relaxed text-mute">{c.d}</p>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-mute transition-colors hover:text-fg">
          {open ? "Less −" : "Details +"}
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-3 text-sm leading-relaxed text-mute">
              {c.more}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </Reveal>
  );
}

export function Capabilities() {
  return (
    <Section id="capabilities">
      <SectionHead eyebrow="03 — Capabilities" title="One workspace. Eight disciplines." />
      <div className="mt-14 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CAPS.map((c, i) => <Card key={c.t} c={c} i={i} />)}
      </div>
    </Section>
  );
}
