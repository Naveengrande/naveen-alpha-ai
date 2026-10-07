"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo, LogoMark } from "@/components/Logo";
import {
  applyTheme, buildProjectContext, clearAllData, DEFAULT_SETTINGS, loadConversations, loadProjects, loadSettings, saveConversations, saveProjects, saveSettings, titleFrom, toApiMessages, uid, Settings,
} from "@/lib/store";
import { ChatError, streamChat } from "@/lib/stream";
import { Attachment, ChatMessage, Conversation, MODELS, Project, StatusResponse, SUMMARY_MARKER } from "@/lib/types";
import { CodeAction, CodeContext } from "./CodeBlock";
import { Composer, ComposerHandle } from "./Composer";
import { Message } from "./Message";
import { FilesPanel, FileRow, ProjectEditor, SettingsPanel, Toasts } from "./Panels";
import { Sidebar } from "./Sidebar";

const AGENT_STAGES = ["Plan", "Research", "Analysis", "Execution", "Verification", "Final Result"] as const;
const AGENT_INSTR: Record<(typeof AGENT_STAGES)[number], string> = {
  Plan: "Produce a numbered plan to achieve the goal: key assumptions, the steps you will take, and what information you still need. Do not execute the plan yet.",
  Research: "Carry out the research step: collect and organise the relevant facts from the conversation, attached files and your own knowledge. State clearly what you could not verify.",
  Analysis: "Analyse the findings: evaluate options, risks and trade-offs, and reach well-supported conclusions.",
  Execution: "Execute the plan by producing the concrete deliverables (text, code, tables). Anything that would act outside this chat must be listed as a proposal marked REQUIRES USER CONFIRMATION.",
  Verification: "Verify the deliverables against the goal: check for errors, gaps and unsupported claims, and list any fixes.",
  "Final Result": "Write the final consolidated result for the user, applying the verification fixes. Make it concise and ready to use.",
};

const SUGGESTIONS = [
  "Analyze this codebase and identify security risks.",
  "Summarize a document I'll upload and extract the key numbers.",
  "Build a Power BI dashboard specification for fraud monitoring.",
  "Explain how transformers work, with a small diagram in text.",
];

type AgentStatus = "running" | "paused" | "awaiting" | "done" | "stopped" | "error";
interface AgentState { convId: string; stageIdx: number; status: AgentStatus; done: number }

export default function ChatApp({ initialQuery = "", initialAgent = false }: { initialQuery?: string; initialAgent?: boolean }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [model, setModel] = useState(DEFAULT_SETTINGS.defaultModel);
  const [draft, setDraft] = useState(initialQuery);
  const [agentMode, setAgentMode] = useState(initialAgent);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [stages, setStages] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState<null | { t: "settings"; tab?: "Privacy" | "Models" } | { t: "project"; id: string | null } | { t: "files" }>(null);
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [drag, setDrag] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  const convosRef = useRef<Conversation[]>([]);
  const settingsRef = useRef(settings);
  const projectsRef = useRef<Project[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const composer = useRef<ComposerHandle>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const searchDesk = useRef<HTMLInputElement>(null);
  const searchDrawer = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const agentCtl = useRef<{ stop: boolean; paused: boolean; release: (() => void) | null }>({ stop: false, paused: false, release: null });
  const stickRef = useRef(true);

  settingsRef.current = settings;
  projectsRef.current = projects;

  const toast = useCallback((text: string) => {
    const id = uid();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);

  const commit = useCallback((next: Conversation[]) => { convosRef.current = next; setConversations(next); }, []);
  const mutate = useCallback((id: string, fn: (c: Conversation) => Conversation) => commit(convosRef.current.map((c) => (c.id === id ? fn(c) : c))), [commit]);

  /* ----- boot ----- */
  const refreshStatus = useCallback(() => {
    fetch("/api/status", { cache: "no-store" }).then((r) => r.json()).then(setStatus).catch(() => {});
  }, []);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    applyTheme(s.theme);
    const cs = loadConversations();
    convosRef.current = cs;
    setConversations(cs);
    setProjects(loadProjects());
    setModel(s.defaultModel);
    setReady(true);
    refreshStatus();
    if (initialQuery) setTimeout(() => composer.current?.focus(), 150);
  }, [initialQuery, refreshStatus]);

  useEffect(() => {
    if (settings.theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: light)");
    const on = () => applyTheme("system");
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [settings.theme]);

  /* ----- persistence ----- */
  useEffect(() => {
    if (!ready || streamId) return;
    const t = setTimeout(() => saveConversations(settings.saveConversations ? conversations : [], settings.retainFiles), 400);
    return () => clearTimeout(t);
  }, [conversations, ready, streamId, settings.saveConversations, settings.retainFiles]);
  useEffect(() => { if (ready) saveProjects(projects); }, [projects, ready]);

  const updateSettings = (s: Settings) => { setSettings(s); saveSettings(s); };
  const setTheme = (t: Settings["theme"]) => { updateSettings({ ...settings, theme: t }); applyTheme(t); };

  /* ----- derived ----- */
  const active = useMemo(() => conversations.find((c) => c.id === activeId) ?? null, [conversations, activeId]);
  const sorted = useMemo(() => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt), [conversations]);
  const streaming = streamId !== null;
  const curModel = active?.model ?? model;
  const modelStatus = status?.models.find((m) => m.id === curModel);
  const anyConfigured = status ? status.models.some((m) => m.configured) : true;
  const blocked = !!status && !modelStatus?.configured;

  const fileRows: FileRow[] = useMemo(() => {
    const seen = new Set<string>();
    const rows: FileRow[] = [];
    for (const c of conversations) for (const m of c.messages) for (const a of m.attachments ?? []) if (!seen.has(a.id)) { seen.add(a.id); rows.push({ att: a, source: c.title, at: m.createdAt }); }
    for (const p of projects) for (const a of p.files) if (!seen.has(a.id)) { seen.add(a.id); rows.push({ att: a, source: `Project: ${p.name}`, at: p.createdAt }); }
    return rows.sort((a, b) => b.at - a.at);
  }, [conversations, projects]);

  /* ----- scrolling ----- */
  const scrollToBottom = useCallback((smooth = false) => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);
  useEffect(() => { if (stickRef.current) scrollToBottom(); }, [conversations, scrollToBottom]);
  const onScroll = () => {
    const el = scroller.current!;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    stickRef.current = near;
    setAtBottom(near);
  };

  /* ----- core: run the assistant ----- */
  const prepareApi = (history: ChatMessage[], instruction?: string) => {
    const userIdx = history.map((m, i) => (m.role === "user" ? i : -1)).filter((i) => i >= 0);
    const keepImagesFrom = userIdx[Math.max(0, userIdx.length - 3)] ?? 0;
    const msgs = history.map((m, i) => ({
      role: m.role,
      content: m.role === "assistant" ? m.content.split(SUMMARY_MARKER)[0].trim() : m.content,
      attachments: m.attachments?.map((a) => (a.kind === "image" && i < keepImagesFrom ? { ...a, dataUrl: undefined } : a)),
    }));
    if (instruction) msgs.push({ role: "user", content: instruction, attachments: undefined });
    return toApiMessages(msgs);
  };

  const runAssistant = useCallback(async (convId: string, o: { history?: ChatMessage[]; instruction?: string; stage?: string } = {}): Promise<{ ok: boolean }> => {
    const conv = convosRef.current.find((c) => c.id === convId);
    if (!conv) return { ok: false };
    const history = o.history ?? conv.messages;
    const aId = uid();
    let label: string | undefined;
    mutate(convId, (c) => ({ ...c, messages: [...history, { id: aId, role: "assistant", content: "", createdAt: Date.now(), model: c.model, stage: o.stage }], updatedAt: Date.now() }));
    const ac = new AbortController();
    abortRef.current = ac;
    setStreamId(aId);
    setStages([]);
    stickRef.current = true;

    const s = settingsRef.current;
    const project = projectsRef.current.find((p) => p.id === conv.projectId);
    let text = "";
    let raf = 0;
    const flush = () => {
      raf = 0;
      mutate(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === aId ? { ...m, content: text, model: label ?? m.model } : m)) }));
    };
    let failed: string | undefined;
    let aborted = false;
    try {
      await streamChat(
        { model: conv.model, messages: prepareApi(history, o.instruction), agent: !!o.stage, projectContext: buildProjectContext(project), customInstructions: s.customInstructions, temperature: s.temperature ?? undefined },
        ac.signal,
        {
          onDelta: (t) => { text += t; if (!raf) raf = requestAnimationFrame(flush); },
          onStage: (st) => setStages((p) => (p.includes(st) ? p : [...p, st])),
          onMeta: (m) => { label = `${m.provider} · ${m.model}`; },
        }
      );
    } catch (e) {
      if ((e as Error).name === "AbortError") aborted = true;
      else {
        failed = (e as Error).message || "Something went wrong.";
        if (e instanceof ChatError && e.notConfigured) refreshStatus();
      }
    }
    if (raf) cancelAnimationFrame(raf);
    mutate(convId, (c) => ({
      ...c,
      messages: c.messages.flatMap((m) => {
        if (m.id !== aId) return [m];
        if (aborted && !text) return [];
        return [{ ...m, content: text, error: failed, model: label ?? m.model }];
      }),
    }));
    setStreamId(null);
    abortRef.current = null;
    if (!aborted && !failed && settingsRef.current.notifications && document.hidden && "Notification" in window && Notification.permission === "granted") {
      new Notification("NAVEEN ALPHA AI", { body: "Your response is ready." });
    }
    return { ok: !aborted && !failed };
  }, [mutate, refreshStatus]);

  /* ----- agent mode ----- */
  const runAgent = useCallback(async (convId: string) => {
    const ctl = agentCtl.current;
    ctl.stop = false;
    ctl.paused = false;
    const wait = () => new Promise<void>((res) => { ctl.release = res; });
    let done = 0;
    for (let i = 0; i < AGENT_STAGES.length; i++) {
      if (ctl.stop) break;
      const needApproval = i === 1 || (settingsRef.current.stepApprovals && i > 0) || ctl.paused;
      if (needApproval) {
        setAgent({ convId, stageIdx: i, status: ctl.paused ? "paused" : "awaiting", done });
        await wait();
        if (ctl.stop) break;
        ctl.paused = false;
      }
      setAgent({ convId, stageIdx: i, status: "running", done });
      const name = AGENT_STAGES[i];
      const res = await runAssistant(convId, { stage: name, instruction: `Agent stage ${i + 1} of ${AGENT_STAGES.length}: ${name}.\n${AGENT_INSTR[name]}\nOnly do this stage. The user's goal is in the conversation above.` });
      if (!res.ok) { setAgent({ convId, stageIdx: i, status: ctl.stop ? "stopped" : "error", done }); return; }
      done = i + 1;
    }
    setAgent((a) => (a ? { ...a, status: ctl.stop ? "stopped" : "done", done } : a));
  }, [runAssistant]);

  const agentControl = (a: "pause" | "resume" | "stop" | "approve") => {
    const ctl = agentCtl.current;
    if (a === "pause") { ctl.paused = true; setAgent((s) => (s && s.status === "running" ? { ...s, status: "paused" } : s)); toast("Will pause after this stage"); }
    if (a === "resume" || a === "approve") { ctl.paused = false; ctl.release?.(); ctl.release = null; }
    if (a === "stop") { ctl.stop = true; abortRef.current?.abort(); ctl.release?.(); ctl.release = null; }
  };

  /* ----- sending ----- */
  const newConversation = (title: string): Conversation => {
    const c: Conversation = { id: uid(), title, projectId: activeProject, model, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    commit([c, ...convosRef.current]);
    setActiveId(c.id);
    return c;
  };

  const send = useCallback(async (text: string, atts: Attachment[], opts: { asAgent?: boolean } = {}) => {
    if (streaming) return;
    let conv = convosRef.current.find((c) => c.id === activeId);
    if (!conv) conv = newConversation(titleFrom(text || atts[0]?.name || "New chat"));
    const userMsg: ChatMessage = { id: uid(), role: "user", content: text, attachments: atts.length ? atts : undefined, createdAt: Date.now() };
    const history = [...conv.messages, userMsg];
    setDraft("");
    const isAgent = opts.asAgent ?? agentMode;
    if (isAgent) {
      mutate(conv.id, (c) => ({ ...c, messages: history, updatedAt: Date.now() }));
      setAgent({ convId: conv.id, stageIdx: 0, status: "running", done: 0 });
      runAgent(conv.id);
    } else {
      await runAssistant(conv.id, { history });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, activeId, agentMode, model, activeProject, runAssistant, runAgent]);

  const regenerate = () => {
    if (!active || streaming) return;
    const msgs = active.messages;
    let i = msgs.length - 1;
    while (i >= 0 && msgs[i].role !== "user") i--;
    if (i < 0) return;
    runAssistant(active.id, { history: msgs.slice(0, i + 1) });
  };
  const continueGen = () => send("Continue from where you left off.", [], { asAgent: false });
  const editPrompt = (id: string, text: string) => {
    if (!active || streaming) return;
    const idx = active.messages.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const edited: ChatMessage = { ...active.messages[idx], content: text };
    const history = [...active.messages.slice(0, idx), edited];
    if (idx === 0) mutate(active.id, (c) => ({ ...c, title: titleFrom(text) }));
    runAssistant(active.id, { history });
  };
  const feedback = (id: string, v: "up" | "down" | null) => active && mutate(active.id, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === id ? { ...m, feedback: v } : m)) }));
  const stop = useCallback(() => { agentCtl.current.stop = agentCtl.current.stop || !!agent; abortRef.current?.abort(); }, [agent]);

  const codeAction = (a: CodeAction, lang: string, code: string) => {
    const verb = { Explain: "Explain", Optimize: "Optimize", Debug: "Find and fix bugs in", Rewrite: "Rewrite more cleanly" }[a];
    send(`${verb} this ${lang} code:\n\n\`\`\`${lang.toLowerCase()}\n${code}\n\`\`\``, [], { asAgent: false });
  };

  /* ----- sidebar actions ----- */
  const newChat = useCallback(() => {
    if (streaming) return;
    setActiveId(null);
    setDraft("");
    setAgent(null);
    setDrawer(false);
    setTimeout(() => composer.current?.focus(), 50);
  }, [streaming]);
  const openChat = (id: string) => {
    if (streaming) return toast("Wait for the response to finish or press stop.");
    const c = convosRef.current.find((x) => x.id === id);
    setActiveId(id);
    if (c) setModel(c.model);
    setAgent((a) => (a && a.convId === id ? a : null));
    setDrawer(false);
    stickRef.current = true;
    setTimeout(() => scrollToBottom(), 30);
  };
  const deleteChat = (id: string) => {
    if (streaming && active?.id === id) abortRef.current?.abort();
    commit(convosRef.current.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };
  const changeModel = (id: string) => {
    setModel(id);
    if (active) mutate(active.id, (c) => ({ ...c, model: id }));
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), conversations: convosRef.current, projects }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "naveen-alpha-export.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /* ----- shortcuts ----- */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "o") { e.preventDefault(); newChat(); }
      else if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (window.innerWidth < 1024) { setDrawer(true); setTimeout(() => searchDrawer.current?.focus(), 250); } else searchDesk.current?.focus();
      } else if (e.key === "Escape" && streaming && !modal) stop();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [newChat, stop, streaming, modal]);

  useEffect(() => { if (initialAgent) setAgentMode(true); }, [initialAgent]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const sidebarProps = {
    conversations: sorted, projects, activeId, activeProject, fileCount: fileRows.length,
    onNew: newChat, onOpen: openChat, onDelete: deleteChat,
    onRename: (id: string, title: string) => mutate(id, (c) => ({ ...c, title })),
    onProject: setActiveProject,
    onNewProject: () => { setDrawer(false); setModal({ t: "project", id: null }); },
    onEditProject: (id: string) => { setDrawer(false); setModal({ t: "project", id }); },
    onFiles: () => { setDrawer(false); setModal({ t: "files" }); },
    onSettings: () => { setDrawer(false); setModal({ t: "settings" }); },
  };

  const lastAssistantId = [...(active?.messages ?? [])].reverse().find((m) => m.role === "assistant")?.id;
  const lastUserId = [...(active?.messages ?? [])].reverse().find((m) => m.role === "user")?.id;
  const proj = projects.find((p) => p.id === (active?.projectId ?? activeProject));
  const agentRunning = !!agent && (agent.status === "running" || agent.status === "paused" || agent.status === "awaiting");

  if (!ready) return <div className="h-[100dvh] bg-ink" />;

  return (
    <div
      className="flex h-[100dvh] overflow-hidden bg-ink"
      onDragEnter={(e) => { if (e.dataTransfer.types.includes("Files")) { dragDepth.current++; setDrag(true); } }}
      onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDrag(false); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); dragDepth.current = 0; setDrag(false); if (e.dataTransfer.files.length) composer.current?.addFiles(e.dataTransfer.files); }}
    >
      <aside className="hidden w-[280px] shrink-0 border-r border-line/10 lg:block"><Sidebar ref={searchDesk} {...sidebarProps} /></aside>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setDrawer(false)} />
            <motion.aside key="dr" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.25 }} className="fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] border-r border-line/10 lg:hidden">
              <Sidebar ref={searchDrawer} {...sidebarProps} onClose={() => setDrawer(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line/10 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => setDrawer(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-line/10 lg:hidden">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
            </button>
            <span className="lg:hidden"><Logo /></span>
            <span className="hidden min-w-0 truncate text-sm text-mute lg:block">{active?.title ?? "New chat"}</span>
            {proj && <span className="hidden rounded-md border border-line/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mute sm:inline">{proj.name}</span>}
          </div>
          <button onClick={newChat} className="flex h-9 items-center gap-2 rounded-lg border border-line/15 px-3 text-sm hover:bg-line/5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg><span className="max-sm:hidden">New chat</span><span className="sm:hidden">New</span>
          </button>
        </header>

        <div ref={scroller} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto">
          {!active || active.messages.length === 0 ? (
            <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-5 py-10 text-center">
              <LogoMark size={44} />
              <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl"><span className="metal">{proj ? proj.name : "How can I help?"}</span></h1>
              <p className="mt-3 max-w-md text-sm text-mute">{proj ? "Chats in this project share its instructions and files." : "Ask anything, analyze a file, or build something."}</p>
              {status && !anyConfigured && (
                <div className="mt-8 w-full max-w-lg rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5 text-left">
                  <div className="text-sm font-semibold">No AI model is connected yet</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-mute">Add at least one provider key to your server environment, then reload. Keys stay on the server.</p>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-panel p-3 font-mono text-xs leading-relaxed text-mute">{`OPENAI_API_KEY=...\nANTHROPIC_API_KEY=...\nGOOGLE_API_KEY=...\nOPENROUTER_API_KEY=...`}</pre>
                  <p className="mt-2 text-xs text-mute">Copy <span className="font-mono">.env.example</span> to <span className="font-mono">.env.local</span> and restart. No fake answers are shown while unconfigured.</p>
                </div>
              )}
              <div className="mt-10 grid w-full gap-2.5 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => { setDraft(s); composer.current?.focus(); }} className="rounded-xl border border-line/10 p-4 text-left text-sm text-mute transition-colors hover:border-line/30 hover:text-fg">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <CodeContext.Provider value={{ onAction: codeAction, toast, streaming }}>
              <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6">
                {active.messages.map((m) => (
                  <Message key={m.id} msg={m} streaming={m.id === streamId} stages={stages} isLastAssistant={m.id === lastAssistantId} canEdit={m.id === lastUserId || true}
                    onRegenerate={regenerate} onContinue={continueGen} onEdit={(t) => editPrompt(m.id, t)} onFeedback={(v) => feedback(m.id, v)} toast={toast} />
                ))}
              </div>
            </CodeContext.Provider>
          )}
          {!atBottom && active && active.messages.length > 0 && (
            <button onClick={() => { stickRef.current = true; scrollToBottom(true); }} aria-label="Scroll to latest" className="sticky bottom-3 left-1/2 z-10 mx-auto -mt-10 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full border border-line/20 bg-raised shadow-lg">↓</button>
          )}
        </div>

        {agent && (
          <div className="mx-auto w-full max-w-3xl px-3 sm:px-4">
            <div className="mb-2 rounded-2xl border border-accent/30 bg-accent/5 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Agent mode</span>
                <div className="flex flex-wrap gap-1.5">
                  {agent.status === "running" && <AgentBtn onClick={() => agentControl("pause")}>Pause</AgentBtn>}
                  {agent.status === "paused" && <AgentBtn primary onClick={() => agentControl("resume")}>Resume</AgentBtn>}
                  {agent.status === "awaiting" && <AgentBtn primary onClick={() => agentControl("approve")}>Approve next: {AGENT_STAGES[agent.stageIdx]}</AgentBtn>}
                  {agentRunning && <AgentBtn onClick={() => agentControl("stop")}>Stop</AgentBtn>}
                  {!agentRunning && <AgentBtn onClick={() => setAgent(null)}>Dismiss</AgentBtn>}
                </div>
              </div>
              <ol className="mt-3 flex gap-1" aria-label="Agent progress">
                {AGENT_STAGES.map((s, i) => {
                  const st = i < agent.done ? "done" : i === agent.stageIdx && agent.status === "running" ? "run" : i === agent.stageIdx && (agent.status === "awaiting" || agent.status === "paused") ? "wait" : "idle";
                  return (
                    <li key={s} className="min-w-0 flex-1" title={s}>
                      <div className={`h-1 rounded-full ${st === "done" ? "bg-accent" : st === "run" ? "animate-blink bg-accent" : st === "wait" ? "bg-accent/40" : "bg-line/15"}`} />
                      <div className={`mt-1.5 truncate text-[10px] ${st === "idle" ? "text-mute/60" : "text-fg"}`}>{s}</div>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-2.5 text-xs text-mute">
                {agent.status === "awaiting" && (agent.stageIdx === 1 ? "Plan ready — review it above, then approve to continue." : "Waiting for your approval.")}
                {agent.status === "paused" && "Paused. Resume when ready."}
                {agent.status === "running" && "Working… The agent only writes text; it never acts outside this chat."}
                {agent.status === "done" && "Finished — all stages complete."}
                {agent.status === "stopped" && "Stopped."}
                {agent.status === "error" && "A stage failed. Check the error above, then dismiss and try again."}
              </p>
            </div>
          </div>
        )}

        {blocked && anyConfigured && (
          <div className="mx-auto mb-2 w-full max-w-3xl px-3 text-xs text-amber-400 sm:px-4">This model isn&apos;t configured on the server. Pick another model below.</div>
        )}
        <Composer ref={composer} value={draft} onChange={setDraft} onSend={(t, a) => send(t, a)} onStop={stop} streaming={streaming || agentRunning && agent?.status === "running"}
          statuses={status?.models ?? []} model={curModel} onModel={changeModel} agent={agentMode} onAgent={setAgentMode} blocked={blocked || agentRunning} toast={toast} />
      </main>

      {drag && (
        <div className="pointer-events-none fixed inset-0 z-[70] grid place-items-center bg-ink/80 backdrop-blur-sm">
          <div className="rounded-2xl border border-dashed border-accent px-10 py-8 text-lg">Drop files to attach</div>
        </div>
      )}

      <AnimatePresence>
        {modal?.t === "settings" && (
          <SettingsPanel key="s" settings={settings} onChange={updateSettings} status={status} initialTab={modal.tab} onClose={() => setModal(null)} onTheme={setTheme} onExport={exportAll} toast={toast}
            onDeleteChats={() => { commit([]); setActiveId(null); saveConversations([], false); }}
            onDeleteAll={() => { commit([]); setProjects([]); setActiveId(null); setActiveProject(null); clearAllData(); }} />
        )}
        {modal?.t === "project" && (
          <ProjectEditor key="p" project={projects.find((p) => p.id === modal.id) ?? null} toast={toast} onClose={() => setModal(null)}
            onSave={(p) => { setProjects((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p])); setActiveProject(p.id); }}
            onDelete={(id) => { setProjects((ps) => ps.filter((x) => x.id !== id)); if (activeProject === id) setActiveProject(null); commit(convosRef.current.map((c) => (c.projectId === id ? { ...c, projectId: null } : c))); }} />
        )}
        {modal?.t === "files" && <FilesPanel key="f" rows={fileRows} onClose={() => setModal(null)} onAttach={(a) => { composer.current?.addAttachments([a]); }} />}
      </AnimatePresence>
      <Toasts items={toasts} />
    </div>
  );
}

function AgentBtn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return <button onClick={onClick} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${primary ? "bg-accent text-ink" : "border border-line/20 hover:bg-line/10"}`}>{children}</button>;
}
