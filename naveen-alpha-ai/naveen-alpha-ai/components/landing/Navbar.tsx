"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "#reasoning", label: "Reasoning" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#benchmarks", label: "Benchmarks" },
  { href: "#how", label: "How It Works" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${scrolled || open ? "glass hairline-b" : ""}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="NAVEEN ALPHA AI home"><Logo /></Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[13px] text-mute transition-colors hover:text-fg">{l.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/chat" className="hidden rounded-xl bg-fg px-4 py-2 text-[13px] font-medium text-ink transition-opacity hover:opacity-85 sm:inline-block">Open Chat</Link>
          <button
            className="grid h-10 w-10 place-items-center rounded-xl hairline md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-5">
              <span className={`absolute left-0 h-px w-5 bg-fg transition-all ${open ? "top-1.5 rotate-45" : "top-0"}`} />
              <span className={`absolute left-0 top-1.5 h-px w-5 bg-fg transition-opacity ${open ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 h-px w-5 bg-fg transition-all ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
            </span>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "calc(100dvh - 4rem)" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-ink md:hidden"
          >
            <div className="flex h-full flex-col justify-between px-5 pb-10 pt-6">
              <nav className="flex flex-col" aria-label="Mobile">
                {LINKS.map((l, i) => (
                  <motion.a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="hairline-b py-5 text-2xl font-medium tracking-tight"
                  >
                    {l.label}
                  </motion.a>
                ))}
              </nav>
              <Link href="/chat" className="rounded-xl bg-fg py-4 text-center font-medium text-ink">Open Chat</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
