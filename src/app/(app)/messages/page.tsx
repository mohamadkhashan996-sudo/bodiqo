"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageCircleHeart } from "lucide-react";
import { motion } from "framer-motion";
import { ConversationList, type ConversationRow } from "@/components/messaging/conversation-list";

export default function MessagesPage() {
  const { data: session } = useSession(); const [rows, setRows] = useState<ConversationRow[]>([]); const [query, setQuery] = useState("");
  useEffect(() => { void fetch("/api/conversations").then((response) => response.json()).then((data: { conversations?: ConversationRow[] }) => setRows(data.conversations ?? [])); }, []);
  return <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/45 shadow-[0_24px_70px_rgba(28,29,42,.08)]"><ConversationList conversations={rows} query={query} onQuery={setQuery} currentUserId={session?.user?.id} /><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="hidden flex-1 place-items-center p-10 md:grid"><div className="max-w-sm text-center"><div className="mx-auto grid size-20 place-items-center rounded-[2rem] bg-[var(--ink)] text-[var(--ember)]"><MessageCircleHeart className="size-9" /></div><h2 className="mt-6 font-[family-name:var(--font-display)] text-3xl">A quieter kind of close.</h2><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Choose a conversation to share a thought, an image, or a little voice note with your people.</p></div></motion.div></div>;
}
