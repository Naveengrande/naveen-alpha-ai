"use client";
import { memo, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { formatBytes } from "@/lib/store";
import { ChatMessage, SUMMARY_MARKER } from "@/lib/types";
import { copyText } from "./CodeBlock";
import { Markdown } from "./Markdown";

export function splitSummary(content: string, streaming: boolean): { body: string; summary: string } {
  const i = content.indexOf(SUMMARY_MARKER);
  if (i >= 0) return { body: content.slice(0, i).trimEnd(), summary: content.slice(i + SUMMARY_MARKER.length).trim() };
  if (streaming) {
    // hide a partially streamed marker such as "<<SUM"
    for (let n = Math.min(SUMMARY_MARKER.length - 1, content.length); n > 0; n--) {
      if (SUMMARY_MARKER.startsWith(content.slice(-n))) return { body: content.slice(0, -n), summary: "" };
    }
  }
  return { body: content, summary: "" };
}

const STAGE_LABEL: Record<string, string> = {
  understanding: "Understanding request",
  context: "Analyzing context",
  files: "Processing files",
  vision: "Analyzing images",
  generating: "Generating response",
};

function StageList({ stages }: { stages: string[] }) {
  const list = ["understanding", "context", ...stages.filter((s) => s !== "understanding")];
  const shown = stages.length === 0 ? ["understanding"] : stages.includes("generating") || stages.length > 1 ? list : ["understanding"];
  const uniq = shown.filter((s, i) => shown.indexOf(s) === i);
  return (
    <ul className="mb-3 space-y-1 text-[13px]" aria-live="polite">
      {uniq.map((s, i) => {
        const active = i === uniq.length - 1;
        return (
          <li key={s} className={`flex items-center gap-2 ${active ? "text-fg" : "text-mute"}`}>
            {active ? <span className="h-1.5 w-1.5 animate-blink rounded-full bg-accent" /> : <span className="text-accent">✓</span>}
            <span className={active ? "" : ""}>{STAGE_LABEL[s] ?? s}</span>
          </li>
        );
      })}
    </ul>
  );
}

function AttachmentCards({ msg }: { msg: ChatMessage }) {
  if (!msg.attachments?.length) return null;
  return (
    <div className="mb-2 flex flex-wrap justify-end gap-2">
      {msg.attachments.map((a) =>
        a.kind === "image" && a.dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={a.id} src={a.dataUrl} alt={a.name} className="max-h-56 max-w-[260px] rounded-xl border border-line/10 object-cover" />
        ) : (
          <div key={a.id} className="flex max-w-[260px] items-center gap-2.5 rounded-xl border border-line/10 bg-panel p-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-line/5 font-mono text-[10px] text-mute">{a.kind === "pdf" ? "PDF" : a.kind === "image" ? "IMG" : (a.name.split(".").pop() || "FILE").slice(0, 4).toUpperCase()}</span>
            <span className="min-w-0"><span className="block truncate text-[13px]">{a.name}</span><span className="block text-[11px] text-mute">{formatBytes(a.size)}{a.truncated ? " · truncated" : ""}{a.kind === "image" && !a.dataUrl ? " · preview unavailable" : ""}</span></span>
          </div>
        )
      )}
    </div>
  );
}

interface Props {
  msg: ChatMessage;
  streaming: boolean;
  stages: string[];
  isLastAssistant: boolean;
  canEdit: boolean;
  onRegenerate: () => void;
  onContinue: () => void;
  onEdit: (text: string) => void;
  onFeedback: (v: "up" | "down" | null) => void;
  toast: (m: string) => void;
}

function MessageImpl({ msg, streaming, stages, isLastAssistant, canEdit, onRegenerate, onContinue, onEdit, onFeedback, toast }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content);
  const [showSummary, setShowSummary] = useState(false);

  if (msg.role === "user") {
    return (
      <div className="group flex flex-col items-end">
        <AttachmentCards msg={msg} />
        {editing ? (
          <div className="w-full max-w-[85%] rounded-2xl border border-line/20 bg-panel p-3">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={Math.min(8, draft.split("\n").length + 1)} autoFocus className="w-full resize-none bg-transparent text-[15px] leading-6 outline-none" aria-label="Edit prompt" />
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={() => { setEditing(false); setDraft(msg.content); }} className="rounded-lg px-3 py-1.5 text-sm text-mute hover:text-fg">Cancel</button>
              <button onClick={() => { if (draft.trim()) { setEditing(false); onEdit(draft.trim()); } }} className="rounded-lg bg-fg px-3 py-1.5 text-sm font-medium text-ink">Save & send</button>
            </div>
          </div>
        ) : (
          msg.content && (
            <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-raised px-4 py-2.5 text-[15px] leading-6">{msg.content}</div>
          )
        )}
        {!editing && canEdit && !streaming && (
          <div className="mt-1 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
            <button onClick={() => copyText(msg.content).then((ok) => toast(ok ? "Copied" : "Copy failed"))} className="rounded-md px-2 py-1 text-xs text-mute hover:bg-line/10 hover:text-fg">Copy</button>
            <button onClick={() => setEditing(true)} className="rounded-md px-2 py-1 text-xs text-mute hover:bg-line/10 hover:text-fg">Edit prompt</button>
          </div>
        )}
      </div>
    );
  }

  const { body, summary: summaryFromContent } = splitSummary(msg.content, streaming);
  const summary = summaryFromContent || msg.summary || "";
  const waiting = streaming && !body;
  return (
    <div className="flex gap-3.5">
      <div className="mt-0.5 shrink-0 text-fg"><LogoMark size={24} /></div>
      <div className="min-w-0 flex-1">
        {msg.stage && <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Agent · {msg.stage}</div>}
        {streaming && <StageList stages={stages} />}
        {waiting ? null : body ? (
          <div className={streaming ? "caret" : ""}><Markdown text={body} /></div>
        ) : null}
        {msg.error && (
          <div role="alert" className="my-2 rounded-xl border border-red-400/30 bg-red-400/5 p-3.5 text-sm text-red-300">
            {msg.error}
            {isLastAssistant && !streaming && <button onClick={onRegenerate} className="ml-3 underline underline-offset-2">Retry</button>}
          </div>
        )}
        {summary && !streaming && (
          <div className="mt-3">
            <button onClick={() => setShowSummary((s) => !s)} aria-expanded={showSummary} className="font-mono text-[11px] uppercase tracking-[0.18em] text-mute hover:text-fg">
              Reasoning summary {showSummary ? "−" : "+"}
            </button>
            {showSummary && <div className="mt-2 rounded-xl border border-line/10 bg-panel px-4 py-1 text-sm"><Markdown text={summary} /></div>}
          </div>
        )}
        {!streaming && (body || msg.error) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-0.5 text-mute">
            <span className="mr-2 text-[11px]"><span className="text-accent">✓</span> Completed</span>
            <ActionBtn label="Copy" onClick={() => copyText(body).then((ok) => toast(ok ? "Copied" : "Copy failed"))} />
            <ActionBtn label="Like" active={msg.feedback === "up"} onClick={() => onFeedback(msg.feedback === "up" ? null : "up")} icon="M7 11v9H4v-9zM7 11l4-8c1.5 0 2.5 1 2.2 2.5L12.7 9H19a2 2 0 0 1 2 2.3l-1.1 7A2 2 0 0 1 18 20H7" />
            <ActionBtn label="Dislike" active={msg.feedback === "down"} onClick={() => onFeedback(msg.feedback === "down" ? null : "down")} icon="M17 13V4h3v9zM17 13l-4 8c-1.5 0-2.5-1-2.2-2.5L11.3 15H5a2 2 0 0 1-2-2.3l1.1-7A2 2 0 0 1 6 4h11" />
            {isLastAssistant && !msg.stage && <ActionBtn label="Regenerate" onClick={onRegenerate} />}
            {isLastAssistant && !msg.stage && body && <ActionBtn label="Continue" onClick={onContinue} />}
            {msg.model && <span className="ml-auto pl-3 font-mono text-[10px] opacity-60">{msg.model}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick, active, icon }: { label: string; onClick: () => void; active?: boolean; icon?: string }) {
  return (
    <button onClick={onClick} aria-label={label} aria-pressed={active} title={label} className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-line/10 hover:text-fg ${active ? "text-accent" : ""}`}>
      {icon && <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d={icon} /></svg>}
      {!icon && label}
    </button>
  );
}

export const Message = memo(MessageImpl);
