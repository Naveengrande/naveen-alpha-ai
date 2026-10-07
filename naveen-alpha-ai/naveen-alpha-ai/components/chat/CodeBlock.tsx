"use client";
import { createContext, memo, useContext, useMemo, useState } from "react";
import { EXT, highlight, LANG_LABEL } from "@/lib/highlight";

export type CodeAction = "Explain" | "Optimize" | "Debug" | "Rewrite";
export interface CodeCtx {
  onAction?: (a: CodeAction, lang: string, code: string) => void;
  toast?: (msg: string) => void;
  streaming?: boolean;
}
export const CodeContext = createContext<CodeCtx>({});

export function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
  return Promise.resolve(fallbackCopy(text));
}
function fallbackCopy(text: string) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function downloadText(name: string, text: string, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const COLLAPSE_AT = 28;

function CodeBlockImpl({ code, lang }: { code: string; lang: string }) {
  const ctx = useContext(CodeContext);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedLong, setExpandedLong] = useState(false);
  const [copied, setCopied] = useState(false);
  const language = (lang || "text").toLowerCase();
  const label = LANG_LABEL[language] ?? (lang ? lang : "Text");
  const lines = useMemo(() => {
    // tokenise per whole block (strings/comments can span lines), then split into lines
    const toks = highlight(code, language);
    const out: { t: string; s: string }[][] = [[]];
    for (const tk of toks) {
      const parts = tk.s.split("\n");
      parts.forEach((p, i) => {
        if (i > 0) out.push([]);
        if (p) out[out.length - 1].push({ t: tk.t, s: p });
      });
    }
    return out;
  }, [code, language]);
  const long = lines.length > COLLAPSE_AT;
  const shown = long && !expandedLong ? lines.slice(0, COLLAPSE_AT) : lines;
  const ext = EXT[language] ?? "txt";

  const doCopy = async () => {
    const ok = await copyText(code);
    setCopied(ok);
    ctx.toast?.(ok ? "Copied code" : "Copy failed");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-line/10 bg-panel">
      <div className="flex items-center justify-between border-b border-line/10 px-3.5 py-2 text-xs text-mute">
        <span className="font-mono uppercase tracking-[0.15em]">{label}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed((c) => !c)} className="rounded-md px-2 py-1 hover:bg-line/10 hover:text-fg" aria-expanded={!collapsed}>{collapsed ? "Expand" : "Collapse"}</button>
          <button onClick={() => downloadText(ext === "Dockerfile" ? "Dockerfile" : `snippet.${ext}`, code)} className="rounded-md px-2 py-1 hover:bg-line/10 hover:text-fg">Download</button>
          <button onClick={doCopy} className="rounded-md px-2 py-1 hover:bg-line/10 hover:text-fg">{copied ? "Copied ✓" : "Copy"}</button>
        </div>
      </div>
      {!collapsed && (
        <>
          <div className="overflow-x-auto">
            <pre className="m-0 flex min-w-full w-max py-3 font-mono text-[13px] leading-6">
              <span className="select-none pl-3.5 pr-4 text-right text-mute/60" aria-hidden="true">
                {shown.map((_, i) => (<span key={i} className="block">{i + 1}</span>))}
              </span>
              <code className="block pr-4">
                {shown.map((ln, i) => (
                  <span key={i} className="block min-h-[1.5rem] whitespace-pre">
                    {ln.length ? ln.map((tk, j) => (tk.t === "plain" ? tk.s : <span key={j} className={`tok-${tk.t}`}>{tk.s}</span>)) : " "}
                  </span>
                ))}
              </code>
            </pre>
          </div>
          {long && (
            <button onClick={() => setExpandedLong((e) => !e)} className="w-full border-t border-line/10 py-2 text-xs text-mute hover:text-fg">
              {expandedLong ? "Show less" : `Show all ${lines.length} lines`}
            </button>
          )}
          {ctx.onAction && !ctx.streaming && (
            <div className="flex flex-wrap gap-1.5 border-t border-line/10 px-3 py-2.5">
              {(["Explain", "Optimize", "Debug", "Rewrite"] as CodeAction[]).map((a) => (
                <button key={a} onClick={() => ctx.onAction!(a, label, code)} className="rounded-lg border border-line/10 px-2.5 py-1 text-xs text-mute transition-colors hover:border-accent/50 hover:text-fg">{a}</button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const CodeBlock = memo(CodeBlockImpl);
