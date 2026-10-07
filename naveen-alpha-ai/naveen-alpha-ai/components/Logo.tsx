export function LogoMark({ size = 26 }: { size?: number }) {
  // Original mark: an "N" whose diagonal terminates in a neural core node.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" stroke="currentColor" strokeOpacity="0.35" />
      <path d="M9 23V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M23 23V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 9L23 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.2" fill="rgb(var(--ink))" stroke="rgb(var(--accent))" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="1" fill="rgb(var(--accent))" />
      <circle cx="9" cy="9" r="1.6" fill="currentColor" />
      <circle cx="23" cy="23" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-fg">
      <LogoMark />
      {!compact && <span className="text-[13px] font-semibold tracking-[0.2em]">NAVEEN ALPHA AI</span>}
    </span>
  );
}
