"use client";
import { forwardRef, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import type { Conversation, Project } from "@/lib/types";

interface Props {
  conversations: Conversation[];
  projects: Project[];
  activeId: string | null;
  activeProject: string | null;
  fileCount: number;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onProject: (id: string | null) => void;
  onNewProject: () => void;
  onEditProject: (id: string) => void;
  onFiles: () => void;
  onSettings: () => void;
  onClose?: () => void;
}

function group(convos: Conversation[]) {
  const now = Date.now();
  const day = 86_400_000;
  const g: Record<string, Conversation[]> = { Today: [], Yesterday: [], "Previous 7 days": [], Older: [] };
  for (const c of convos) {
    const age = now - c.updatedAt;
    (age < day ? g.Today : age < 2 * day ? g.Yesterday : age < 7 * day ? g["Previous 7 days"] : g.Older).push(c);
  }
  return Object.entries(g).filter(([, v]) => v.length);
}

export const Sidebar = forwardRef<HTMLInputElement, Props>(function Sidebar(p, searchRef) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = p.activeProject ? p.conversations.filter((c) => c.projectId === p.activeProject) : p.conversations;
    if (term) list = list.filter((c) => c.title.toLowerCase().includes(term) || c.messages.some((m) => m.content.toLowerCase().includes(term)));
    return list;
  }, [q, p.conversations, p.activeProject]);

  const groups = useMemo(() => group(filtered), [filtered]);

  return (
    <div className="flex h-full w-full flex-col bg-panel">
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <a href="/" aria-label="Back to home"><Logo /></a>
        {p.onClose && <button onClick={p.onClose} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-lg text-mute hover:bg-line/10 lg:hidden">×</button>}
      </div>
      <div className="space-y-2 px-3">
        <button onClick={p.onNew} className="flex w-full items-center gap-2.5 rounded-xl border border-line/15 px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-line/5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg> New chat
        </button>
        <div className="relative">
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="w-full rounded-xl bg-line/5 px-3.5 py-2.5 text-sm outline-none placeholder:text-mute focus:bg-line/10" />
          {q && <button onClick={() => setQ("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute hover:text-fg">×</button>}
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto px-3 pb-3">
        <div className="mb-1 flex items-center justify-between px-2 pt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
          <span>Projects</span>
          <button onClick={p.onNewProject} aria-label="New project" className="rounded px-1.5 text-base leading-none hover:bg-line/10 hover:text-fg">+</button>
        </div>
        <div className="mb-3 space-y-0.5">
          {p.projects.length === 0 && <p className="px-2 py-1 text-xs text-mute">Group chats with shared instructions and files.</p>}
          {p.projects.map((pr) => (
            <div key={pr.id} className={`group flex items-center rounded-lg ${p.activeProject === pr.id ? "bg-line/10" : "hover:bg-line/5"}`}>
              <button onClick={() => p.onProject(p.activeProject === pr.id ? null : pr.id)} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0 text-mute"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
                <span className="truncate">{pr.name}</span>
              </button>
              <button onClick={() => p.onEditProject(pr.id)} aria-label={`Edit project ${pr.name}`} className="mr-1 rounded px-1.5 py-1 text-xs text-mute opacity-0 hover:text-fg focus:opacity-100 group-hover:opacity-100 max-lg:opacity-100">Edit</button>
            </div>
          ))}
        </div>

        {groups.length === 0 && <p className="px-2 py-6 text-center text-xs text-mute">{q ? "No matching conversations." : "No conversations yet."}</p>}
        {groups.map(([label, list]) => (
          <div key={label} className="mb-3">
            <div className="px-2 pb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">{label}</div>
            {list.map((c) => (
              <div key={c.id} className={`group relative flex items-center rounded-lg ${p.activeId === c.id ? "bg-line/10" : "hover:bg-line/5"}`}>
                {editing === c.id ? (
                  <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Rename conversation"
                    onBlur={() => { if (title.trim()) p.onRename(c.id, title.trim()); setEditing(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(null); }}
                    className="m-1 w-full rounded-md bg-ink px-2 py-1.5 text-sm outline-none ring-1 ring-line/30" />
                ) : (
                  <>
                    <button onClick={() => p.onOpen(c.id)} className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm" title={c.title}>{c.title}</button>
                    <div className="mr-1 flex opacity-0 focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
                      <button onClick={() => { setTitle(c.title); setEditing(c.id); }} aria-label="Rename" className="rounded px-1.5 py-1 text-xs text-mute hover:text-fg">Rename</button>
                      <button onClick={() => p.onDelete(c.id)} aria-label="Delete conversation" className="rounded px-1.5 py-1 text-xs text-mute hover:text-red-400">Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-0.5 border-t border-line/10 p-3">
        <button onClick={p.onFiles} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm text-mute hover:bg-line/5 hover:text-fg">Uploaded files<span className="font-mono text-xs">{p.fileCount}</span></button>
        <button onClick={p.onSettings} className="flex w-full items-center rounded-lg px-2.5 py-2 text-sm text-mute hover:bg-line/5 hover:text-fg">Settings</button>
      </div>
    </div>
  );
});
