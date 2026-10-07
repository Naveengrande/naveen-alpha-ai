import type { Metadata } from "next";
import ChatApp from "@/components/chat/ChatApp";

export const metadata: Metadata = { title: "Chat — NAVEEN ALPHA AI" };

export default function ChatPage({ searchParams }: { searchParams: { q?: string; agent?: string } }) {
  const q = typeof searchParams.q === "string" ? searchParams.q.slice(0, 4000) : "";
  return <ChatApp initialQuery={q} initialAgent={searchParams.agent === "1"} />;
}
