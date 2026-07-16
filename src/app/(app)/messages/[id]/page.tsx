"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { ChatThread } from "@/components/messaging/chat-thread";
import { ConversationList, type ConversationRow } from "@/components/messaging/conversation-list";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>(); const { data: session } = useSession(); const [rows, setRows] = useState<ConversationRow[]>([]); const [query, setQuery] = useState("");
  useEffect(() => { void fetch("/api/conversations").then((response) => response.json()).then((data: { conversations?: ConversationRow[] }) => setRows(data.conversations ?? [])); }, []);
  return <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/45 shadow-[0_24px_70px_rgba(28,29,42,.08)]"><div className="hidden md:block"><ConversationList conversations={rows} activeId={id} query={query} onQuery={setQuery} currentUserId={session?.user?.id} /></div><ChatThread conversationId={id} /></div>;
}
