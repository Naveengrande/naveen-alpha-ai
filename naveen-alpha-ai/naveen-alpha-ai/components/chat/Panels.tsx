"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatBytes, uid, Settings } from "@/lib/store";
import { uploadFile } from "@/lib/stream";
import { Attachment, MODELS, Project, StatusResponse } from "@/lib/types";

/* ---------------- shared ---------------- */
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line/15 bg-ink shadow-2xl sm:rounded-2xl ${wide ? "sm:max-w-4xl" : "sm:max-w-xl"}`}>
        <div className="flex items-center justify-between border-b border-line/10 px-5 py-4">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-mute hover:bg-line/10 hover:text-fg">×</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </motion.div>
    </motion.div>
  );
}

export function Toasts({ items }: { items: { id: string; text: string }[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-line/15 bg-raised px-4 py-2.5 text-sm shadow-xl">{t.text}</motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-line/20"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-line/10 py-4 last:border-0">
      <div className="min-w-0"><div className="text-sm font-medium">{title}</div>{desc && <div className="mt-0.5 text-xs leading-relaxed text-mute">{desc}</div>}</div>
      {children}
    </div>
  );
}

/* ---------------- settings ---------------- */
const TABS = ["Account", "Appearance", "Models", "AI Preferences", "Privacy", "Data Controls", "Keyboard Shortcuts", "Notifications", "API", "About"] as const;
type Tab = (typeof TABS)[number];

const SHORTCUTS: [string, string][] = [
  ["Send message", "Enter"], ["New line", "Shift + Enter"], ["New chat", "Ctrl/⌘ + Shift + O"], ["Search conversations", "Ctrl/⌘ + K"], ["Stop generating", "Esc"], ["Close dialogs", "Esc"],
];

export function SettingsPanel({ settings, onChange, status, onClose, onExport, onDeleteChats, onDeleteAll, onTheme, toast, initialTab = "Privacy" }: {
  settings: Settings; onChange: (s: Settings) => void; status: StatusResponse | null; onClose: () => void; onExport: () => void; onDeleteChats: () => void; onDeleteAll: () => void; onTheme: (t: Settings["theme"]) => void; toast: (m: string) => void; initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  const [confirm, setConfirm] = useState<null | "chats" | "all">(null);

  return (
    <Modal title="Settings" onClose={onClose} wide>
      <div className="flex min-h-[460px] flex-col sm:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line/10 p-2 sm:w-52 sm:flex-col sm:border-b-0 sm:border-r sm:p-3" aria-label="Settings sections">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} aria-current={tab === t} className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm ${tab === t ? "bg-line/10 font-medium" : "text-mute hover:bg-line/5 hover:text-fg"}`}>{t}</button>
          ))}
        </nav>
        <div className="min-w-0 flex-1 p-5 sm:p-7">
          {tab === "Account" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Account</h3>
              <Row title="Guest session" desc="No account is required. Your chats live in this browser."><span className="rounded-md border border-line/15 px-2.5 py-1 font-mono text-[11px] uppercase text-mute">Active</span></Row>
              <Row title="Cloud sync & sign-in" desc={status?.persistence.supabase ? "Supabase credentials detected on the server. Wire the auth UI to enable sign-in." : "Not configured. Add Supabase variables and run supabase/schema.sql to enable accounts and sync."}><span className="font-mono text-[11px] uppercase text-mute">{status?.persistence.supabase ? "Ready" : "Off"}</span></Row>
            </div>
          )}
          {tab === "Appearance" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Appearance</h3>
              <div className="grid grid-cols-3 gap-3">
                {(["dark", "light", "system"] as const).map((t) => (
                  <button key={t} onClick={() => onTheme(t)} aria-pressed={settings.theme === t} className={`rounded-xl border p-4 text-sm capitalize ${settings.theme === t ? "border-accent bg-accent/5" : "border-line/15 hover:bg-line/5"}`}>{t}</button>
                ))}
              </div>
            </div>
          )}
          {tab === "Models" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Models</h3>
              <Row title="Default model" desc="Used for new chats.">
                <select value={settings.defaultModel} onChange={(e) => set("defaultModel", e.target.value)} className="rounded-lg border border-line/15 bg-panel px-3 py-2 text-sm" aria-label="Default model">
                  {MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Row>
              <div className="mt-5 space-y-2">
                {MODELS.map((m) => {
                  const s = status?.models.find((x) => x.id === m.id);
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-4 rounded-xl border border-line/10 p-3.5">
                      <div><div className="text-sm font-semibold tracking-wide">{m.name}</div><div className="text-xs text-mute">{m.tagline}</div></div>
                      <div className="text-right font-mono text-[11px] text-mute">{s?.configured ? <>{s.providerLabel}<br />{s.model}</> : <span className="text-amber-400">Not configured</span>}</div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-mute">Each model maps to a provider through server environment variables (NAVEEN_ALPHA_MODEL=provider:model-id). Changing providers needs no UI changes.</p>
            </div>
          )}
          {tab === "AI Preferences" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">AI preferences</h3>
              <label className="text-sm font-medium" htmlFor="ci">Custom instructions</label>
              <textarea id="ci" value={settings.customInstructions} maxLength={2000} onChange={(e) => set("customInstructions", e.target.value)} rows={5} placeholder="e.g. Answer concisely. I work mostly with Python and SQL." className="mt-2 w-full resize-none rounded-xl border border-line/15 bg-panel p-3 text-sm outline-none focus:border-line/40" />
              <div className="mt-6">
                <Row title="Creativity (temperature)" desc="Automatic uses the provider default (recommended; some reasoning models ignore this).">
                  <div className="flex items-center gap-3">
                    <Toggle on={settings.temperature === null} onChange={(v) => set("temperature", v ? null : 0.7)} label="Automatic temperature" />
                    {settings.temperature !== null && <input type="range" min={0} max={1} step={0.1} value={settings.temperature} onChange={(e) => set("temperature", Number(e.target.value))} aria-label="Temperature" className="w-28 accent-[rgb(var(--accent))]" />}
                    <span className="w-8 font-mono text-xs text-mute">{settings.temperature === null ? "auto" : settings.temperature.toFixed(1)}</span>
                  </div>
                </Row>
                <Row title="Agent: approve every stage" desc="Pause for your approval before each Agent Mode stage (the plan always needs approval)."><Toggle on={settings.stepApprovals} onChange={(v) => set("stepApprovals", v)} label="Approve every agent stage" /></Row>
              </div>
            </div>
          )}
          {tab === "Privacy" && (
            <div>
              <h3 className="mb-1 text-lg font-semibold">Your data</h3>
              <p className="mb-4 text-sm leading-relaxed text-mute">What you type and attach is sent to the model provider shown below to generate replies. Here is where else it goes.</p>
              <Row title="Conversation storage" desc={settings.saveConversations ? "Saved in this browser's local storage only. Not uploaded to any database." : "Off — conversations vanish when you close or reload this tab."}><Toggle on={settings.saveConversations} onChange={(v) => set("saveConversations", v)} label="Save conversations in this browser" /></Row>
              <Row title="File retention" desc={settings.retainFiles ? "File contents are kept with saved chats in this browser so you can ask follow-ups after reloading." : "Only file names are kept after reload; contents are discarded."}><Toggle on={settings.retainFiles} onChange={(v) => set("retainFiles", v)} label="Retain file contents in saved chats" /></Row>
              <div className="py-4">
                <div className="text-sm font-medium">Model provider</div>
                <div className="mt-2 space-y-1.5">
                  {MODELS.map((m) => { const s = status?.models.find((x) => x.id === m.id); return (
                    <div key={m.id} className="flex justify-between gap-3 text-xs"><span className="text-mute">{m.name}</span><span className="font-mono">{s?.configured ? `${s.providerLabel} · ${s.model}` : "not configured"}</span></div>); })}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-mute">Uploaded files are parsed in server memory to extract text and are not written to disk by this app. The provider&apos;s own retention policy applies to anything sent to it. {status?.persistence.supabase ? "Server-side persistence is enabled." : "No server-side database is configured."}</p>
              </div>
            </div>
          )}
          {tab === "Data Controls" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Data controls</h3>
              <Row title="Export conversations" desc="Download all chats and projects as JSON."><button onClick={onExport} className="rounded-lg border border-line/15 px-3.5 py-2 text-sm hover:bg-line/5">Export</button></Row>
              <Row title="Delete all conversations" desc="Removes every chat from this browser."><button onClick={() => setConfirm("chats")} className="rounded-lg border border-red-400/40 px-3.5 py-2 text-sm text-red-300 hover:bg-red-400/10">Delete</button></Row>
              <Row title="Delete everything" desc="Chats, projects, project files and settings."><button onClick={() => setConfirm("all")} className="rounded-lg border border-red-400/40 px-3.5 py-2 text-sm text-red-300 hover:bg-red-400/10">Delete all</button></Row>
              {confirm && (
                <div role="alertdialog" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm">
                  This can&apos;t be undone. {confirm === "all" ? "All local data" : "All conversations"} will be deleted.
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => { confirm === "all" ? onDeleteAll() : onDeleteChats(); setConfirm(null); toast("Deleted"); }} className="rounded-lg bg-red-500 px-3 py-1.5 font-medium text-white">Yes, delete</button>
                    <button onClick={() => setConfirm(null)} className="rounded-lg px-3 py-1.5 text-mute hover:text-fg">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === "Keyboard Shortcuts" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Keyboard shortcuts</h3>
              {SHORTCUTS.map(([a, k]) => <Row key={a} title={a}><kbd className="rounded-md border border-line/20 bg-panel px-2 py-1 font-mono text-xs">{k}</kbd></Row>)}
            </div>
          )}
          {tab === "Notifications" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Notifications</h3>
              <Row title="Notify when a reply finishes" desc="Browser notification when this tab is in the background.">
                <Toggle on={settings.notifications} label="Reply notifications" onChange={async (v) => {
                  if (v && "Notification" in window && Notification.permission !== "granted") {
                    const r = await Notification.requestPermission();
                    if (r !== "granted") { toast("Notification permission denied"); return; }
                  } else if (v && !("Notification" in window)) { toast("Notifications aren't supported here"); return; }
                  set("notifications", v);
                }} />
              </Row>
            </div>
          )}
          {tab === "API" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">API & providers</h3>
              <p className="mb-4 text-sm text-mute">Keys live in server environment variables and are never sent to the browser.</p>
              <div className="space-y-2">
                {(status?.providers ?? []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-line/10 p-3.5 text-sm">
                    <span>{p.label}<span className="ml-2 font-mono text-[11px] text-mute">{p.id.toUpperCase()}_API_KEY</span></span>
                    <span className={`font-mono text-[11px] uppercase ${p.configured ? "text-emerald-400" : "text-mute"}`}>{p.configured ? "Configured" : "Missing"}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-line/10 bg-panel p-4 font-mono text-xs leading-relaxed text-mute">
                POST /api/chat → text/event-stream<br />POST /api/upload → multipart file<br />GET /api/status → provider &amp; limits
              </div>
              <p className="mt-3 text-xs text-mute">Limits: {status?.limits.rateLimitPerMin ?? "–"} requests/min per IP · {status?.limits.maxUploadMB ?? "–"} MB per upload.</p>
            </div>
          )}
          {tab === "About" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">About</h3>
              <p className="text-sm leading-relaxed text-mute">NAVEEN ALPHA AI — Think deeper. Build faster.<br />Version 0.1.0 · © 2026 Naveen Alpha AI</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- projects ---------------- */
export function ProjectEditor({ project, onSave, onDelete, onClose, toast }: { project: Project | null; onSave: (p: Project) => void; onDelete?: (id: string) => void; onClose: () => void; toast: (m: string) => void }) {
  const [name, setName] = useState(project?.name ?? "");
  const [instructions, setInstructions] = useState(project?.instructions ?? "");
  const [files, setFiles] = useState<Attachment[]>(project?.files ?? []);
  const [busy, setBusy] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const add = (list: FileList | null) => {
    if (!list) return;
    Array.from(list).forEach((f) => {
      setBusy((b) => b + 1);
      uploadFile(f).then((a) => setFiles((s) => [...s, a])).catch((e: Error) => toast(`${f.name}: ${e.message}`)).finally(() => setBusy((b) => b - 1));
    });
  };

  return (
    <Modal title={project ? "Edit project" : "New project"} onClose={onClose}>
      <div className="space-y-5 p-5">
        <div>
          <label htmlFor="pn" className="text-sm font-medium">Project name</label>
          <input id="pn" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Fraud Risk Intelligence" className="mt-2 w-full rounded-xl border border-line/15 bg-panel px-3.5 py-2.5 text-sm outline-none focus:border-line/40" />
        </div>
        <div>
          <label htmlFor="pi" className="text-sm font-medium">Instructions</label>
          <textarea id="pi" value={instructions} maxLength={4000} rows={4} onChange={(e) => setInstructions(e.target.value)} placeholder="You are my risk analytics assistant." className="mt-2 w-full resize-none rounded-xl border border-line/15 bg-panel p-3.5 text-sm outline-none focus:border-line/40" />
        </div>
        <div>
          <div className="flex items-center justify-between"><span className="text-sm font-medium">Reference files</span><button onClick={() => input.current?.click()} className="rounded-lg border border-line/15 px-3 py-1.5 text-xs hover:bg-line/5">{busy ? "Uploading…" : "Add files"}</button></div>
          <input ref={input} type="file" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          <div className="mt-2 space-y-1.5">
            {files.length === 0 && <p className="text-xs text-mute">Files here are shared as context with every chat in this project.</p>}
            {files.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-line/10 px-3 py-2 text-sm"><span className="truncate">{f.name}<span className="ml-2 text-xs text-mute">{formatBytes(f.size)}</span></span><button onClick={() => setFiles((s) => s.filter((x) => x.id !== f.id))} className="text-mute hover:text-red-400" aria-label={`Remove ${f.name}`}>×</button></div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-mute">Files are stored in this browser. Images can&apos;t be used as project context yet; add text, PDFs, CSV or code.</p>
        </div>
        <div className="flex items-center justify-between pt-2">
          {project && onDelete ? <button onClick={() => { onDelete(project.id); onClose(); }} className="text-sm text-red-300 hover:underline">Delete project</button> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm text-mute hover:text-fg">Cancel</button>
            <button disabled={!name.trim() || busy > 0} onClick={() => { onSave({ id: project?.id ?? uid(), name: name.trim(), instructions, files: files.filter((f) => f.kind !== "image"), createdAt: project?.createdAt ?? Date.now() }); onClose(); }} className="rounded-xl bg-fg px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-30">Save project</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- uploaded files ---------------- */
export interface FileRow { att: Attachment; source: string; at: number }

export function FilesPanel({ rows, onAttach, onClose }: { rows: FileRow[]; onAttach: (a: Attachment) => void; onClose: () => void }) {
  return (
    <Modal title="Uploaded files" onClose={onClose}>
      <div className="p-3">
        {rows.length === 0 && <p className="p-6 text-center text-sm text-mute">Files you attach in chats or projects appear here.</p>}
        {rows.map((r) => {
          const usable = !!(r.att.text || r.att.dataUrl);
          return (
            <div key={r.att.id + r.source} className="flex items-center gap-3 rounded-xl p-3 hover:bg-line/5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-line/5 font-mono text-[10px] text-mute">{r.att.kind === "pdf" ? "PDF" : r.att.kind === "image" ? "IMG" : (r.att.name.split(".").pop() || "FILE").slice(0, 4).toUpperCase()}</span>
              <div className="min-w-0 flex-1"><div className="truncate text-sm">{r.att.name}</div><div className="truncate text-xs text-mute">{formatBytes(r.att.size)} · {r.source}</div></div>
              <button disabled={!usable} onClick={() => { onAttach(r.att); onClose(); }} title={usable ? "Attach to next message" : "Content wasn't retained"} className="rounded-lg border border-line/15 px-3 py-1.5 text-xs hover:bg-line/5 disabled:opacity-30">Attach</button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
