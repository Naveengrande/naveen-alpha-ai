"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { uploadFile } from "@/lib/stream";
import { formatBytes, uid } from "@/lib/store";
import { Attachment, MODELS, ModelStatus } from "@/lib/types";

interface Pending {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "ready" | "error";
  attachment?: Attachment;
  error?: string;
  preview?: string;
}

export interface ComposerHandle {
  addFiles: (files: FileList | File[]) => void;
  addAttachments: (a: Attachment[]) => void;
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string, atts: Attachment[]) => void;
  onStop: () => void;
  streaming: boolean;
  statuses: ModelStatus[];
  model: string;
  onModel: (id: string) => void;
  agent: boolean;
  onAgent: (v: boolean) => void;
  blocked: boolean;
  toast: (m: string) => void;
}

const ICON = { file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5", img: "M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M9 9.5h.01", cam: "M4 8h3l2-3h6l2 3h3v11H4z M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", vid: "M3 6h13v12H3z M16 10l5-3v10l-5-3" };
const Svg = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export const Composer = forwardRef<ComposerHandle, Props>(function Composer(p, ref) {
  const { value, onChange, onSend, onStop, streaming, statuses, model, onModel, agent, onAgent, blocked, toast } = p;
  const [pending, setPending] = useState<Pending[]>([]);
  const [menu, setMenu] = useState<"attach" | "model" | null>(null);
  const [listening, setListening] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const inputs = { any: useRef<HTMLInputElement>(null), photo: useRef<HTMLInputElement>(null), cam: useRef<HTMLInputElement>(null), pdf: useRef<HTMLInputElement>(null), vid: useRef<HTMLInputElement>(null) };
  const wrapRef = useRef<HTMLDivElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).slice(0, 10).forEach((f) => {
      const id = uid();
      const preview = f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined;
      setPending((s) => [...s, { id, name: f.name, size: f.size, status: "uploading", preview }]);
      uploadFile(f)
        .then((a) => setPending((s) => s.map((x) => (x.id === id ? { ...x, status: "ready", attachment: a } : x))))
        .catch((e: Error) => setPending((s) => s.map((x) => (x.id === id ? { ...x, status: "error", error: e.message } : x))));
    });
  }, []);

  useImperativeHandle(ref, () => ({
    addFiles,
    addAttachments: (atts) => setPending((s) => [...s, ...atts.map((a): Pending => ({ id: uid(), name: a.name, size: a.size, status: "ready", attachment: a, preview: a.dataUrl }))]),
    focus: () => taRef.current?.focus(),
  }), [addFiles]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 220) + "px";
  }, [value]);

  useEffect(() => {
    const close = (e: PointerEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenu(null); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const ready = pending.filter((x) => x.status === "ready");
  const uploading = pending.some((x) => x.status === "uploading");
  const canSend = !blocked && !uploading && (value.trim().length > 0 || ready.length > 0);

  const send = () => {
    if (!canSend || streaming) return;
    onSend(value.trim(), ready.map((r) => r.attachment!));
    pending.forEach((x) => x.preview?.startsWith("blob:") && URL.revokeObjectURL(x.preview));
    setPending([]);
  };

  const toggleMic = () => {
    type SR = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return toast("Voice input isn't supported in this browser.");
    if (listening) { recRef.current?.stop(); return; }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    const base = value;
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      onChange((base ? base.trimEnd() + " " : "") + t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); toast("Microphone unavailable or permission denied."); };
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { toast("Could not start voice input."); }
  };

  const current = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const cs = statuses.find((s) => s.id === current.id);

  const pick = (ref: React.RefObject<HTMLInputElement>) => { setMenu(null); ref.current?.click(); };
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; };

  return (
    <div ref={wrapRef} className="mx-auto w-full max-w-3xl px-3 pb-3 sm:px-4 sm:pb-5">
      <div className="rounded-2xl border border-line/15 bg-panel shadow-[0_0_0_1px_rgb(var(--line)/0.02)] transition-colors focus-within:border-line/30">
        {pending.length > 0 && (
          <div className="flex gap-2 overflow-x-auto p-3 pb-0">
            {pending.map((x) => (
              <div key={x.id} className="relative flex min-w-[190px] max-w-[240px] items-center gap-2.5 rounded-xl border border-line/10 bg-raised p-2">
                {x.preview ? <img src={x.preview} alt="" className="h-10 w-10 rounded-lg object-cover" /> : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-line/5 font-mono text-[10px] text-mute">{(x.name.split(".").pop() || "FILE").slice(0, 4).toUpperCase()}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{x.name}</span>
                  <span className={`block text-[11px] ${x.status === "error" ? "text-red-400" : "text-mute"}`}>
                    {x.status === "uploading" ? "Uploading…" : x.status === "error" ? x.error : `${formatBytes(x.size)} · Ready`}
                  </span>
                </span>
                <button onClick={() => setPending((s) => s.filter((y) => y.id !== x.id))} aria-label={`Remove ${x.name}`} className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-mute hover:bg-line/10 hover:text-fg">×</button>
                {x.status === "uploading" && <span className="absolute inset-x-2 bottom-0 h-px overflow-hidden"><span className="block h-full w-1/2 animate-sweep bg-accent" /></span>}
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={taRef}
          value={value}
          rows={1}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
          }}
          onPaste={(e) => { if (e.clipboardData.files.length) { e.preventDefault(); addFiles(e.clipboardData.files); } }}
          placeholder={agent ? "Describe a goal for the agent to plan and work through…" : "Ask anything, analyze a file, or build something…"}
          aria-label="Message"
          className="block max-h-[220px] w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[15px] leading-6 outline-none placeholder:text-mute"
        />
        <div className="flex items-center justify-between gap-2 p-2.5 pt-1.5">
          <div className="flex items-center gap-1">
            <div className="relative">
              <button onClick={() => setMenu(menu === "attach" ? null : "attach")} aria-label="Attach" aria-expanded={menu === "attach"} className="grid h-9 w-9 place-items-center rounded-lg text-mute transition-colors hover:bg-line/10 hover:text-fg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M21 11.5 12.5 20a5.5 5.5 0 0 1-7.8-7.8l9-9a3.7 3.7 0 0 1 5.2 5.2l-9 9a1.8 1.8 0 0 1-2.6-2.6l8.3-8.3" /></svg>
              </button>
              <AnimatePresence>
                {menu === "attach" && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute bottom-11 left-0 z-30 w-52 rounded-xl border border-line/15 bg-raised p-1.5 shadow-2xl">
                    {[
                      ["Attach file", ICON.file, inputs.any], ["Upload image", ICON.img, inputs.photo], ["Take photo", ICON.cam, inputs.cam], ["Upload PDF", ICON.file, inputs.pdf], ["Upload video", ICON.vid, inputs.vid],
                    ].map(([label, d, r]) => (
                      <button key={label as string} onClick={() => pick(r as React.RefObject<HTMLInputElement>)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-line/10"><Svg d={d as string} />{label as string}</button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button onClick={toggleMic} aria-label={listening ? "Stop voice input" : "Voice input"} aria-pressed={listening} className={`grid h-9 w-9 place-items-center rounded-lg transition-colors hover:bg-line/10 ${listening ? "text-red-400" : "text-mute hover:text-fg"}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </button>
            <button onClick={() => onAgent(!agent)} aria-pressed={agent} className={`h-9 rounded-lg border px-3 text-[12px] font-medium tracking-wide transition-colors ${agent ? "border-accent/60 bg-accent/10 text-accent" : "border-transparent text-mute hover:bg-line/10 hover:text-fg"}`}>
              Agent
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button onClick={() => setMenu(menu === "model" ? null : "model")} aria-haspopup="listbox" aria-expanded={menu === "model"} className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-[12px] text-mute transition-colors hover:bg-line/10 hover:text-fg">
                <span className={`h-1.5 w-1.5 rounded-full ${cs?.configured ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className="max-w-[110px] truncate font-medium tracking-wide sm:max-w-none">{current.name}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m2 4 3 3 3-3" /></svg>
              </button>
              <AnimatePresence>
                {menu === "model" && (
                  <motion.div role="listbox" aria-label="Model" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute bottom-11 right-0 z-30 w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-line/15 bg-raised p-1.5 shadow-2xl">
                    {MODELS.map((m) => {
                      const st = statuses.find((s) => s.id === m.id);
                      return (
                        <button key={m.id} role="option" aria-selected={m.id === model} onClick={() => { onModel(m.id); setMenu(null); }} className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-line/10 ${m.id === model ? "bg-line/5" : ""}`}>
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${st?.configured ? "bg-emerald-400" : "bg-amber-400"}`} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold tracking-wide">{m.name}</span>
                            <span className="block text-xs text-mute">{m.tagline}</span>
                            <span className="mt-0.5 block truncate font-mono text-[10px] text-mute/80">{st?.configured ? `${st.providerLabel} · ${st.model}` : "Not configured"}</span>
                          </span>
                          {m.id === model && <span className="text-accent">✓</span>}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {streaming ? (
              <button onClick={onStop} aria-label="Stop generating" className="grid h-9 w-9 place-items-center rounded-lg bg-fg text-ink"><span className="h-3 w-3 rounded-[2px] bg-ink" /></button>
            ) : (
              <button onClick={send} disabled={!canSend} aria-label="Send message" className="grid h-9 w-9 place-items-center rounded-lg bg-fg text-ink transition-opacity disabled:opacity-25">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 hidden text-center text-[11px] text-mute sm:block">Enter to send · Shift + Enter for a new line · AI can make mistakes — verify important output.</p>

      <input ref={inputs.any} type="file" multiple hidden onChange={onPick} />
      <input ref={inputs.photo} type="file" accept="image/*" multiple hidden onChange={onPick} />
      <input ref={inputs.cam} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={inputs.pdf} type="file" accept="application/pdf,.pdf" multiple hidden onChange={onPick} />
      <input ref={inputs.vid} type="file" accept="video/*" hidden onChange={onPick} />
    </div>
  );
});
