"use client";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export function Reveal({ children, delay = 0, className = "", y = 24 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Counter({ to, suffix = "", decimals = 0, duration = 1.8, format }: { to: number; suffix?: string; decimals?: number; duration?: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: setVal });
    return () => c.stop();
  }, [inView, to, duration]);
  const text = format ? format(val) : val.toFixed(decimals);
  return (
    <span ref={ref}>
      {text}
      {suffix}
    </span>
  );
}

export function SectionHead({ eyebrow, title, sub, center = false }: { eyebrow: string; title: React.ReactNode; sub?: string; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.28em] text-mute">{eyebrow}</div>
      <h2 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
        <span className="metal">{title}</span>
      </h2>
      {sub && <p className="mt-6 text-base leading-relaxed text-mute sm:text-lg">{sub}</p>}
    </Reveal>
  );
}

export function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`relative mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 md:py-32 ${className}`}>
      {children}
    </section>
  );
}
