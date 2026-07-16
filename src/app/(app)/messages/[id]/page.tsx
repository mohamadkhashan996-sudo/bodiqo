"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { ChatThread } from "@/components/messaging/chat-thread";
import { ConversationList, type ConversationRow } from "@/components/messaging/conversation-list";
import { PageTransition } from "@/components/motion/primitives";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void fetch("/api/conversations")
      .then((response) => response.json())
      .then((data: { conversations?: ConversationRow[] }) => setRows(data.conversations ?? []));
  }, []);

  return (
    <PageTransition className="page-shell">
      <div className="surface-panel-strong flex min-h-[calc(100vh-10rem)] overflow-hidden rounded-[var(--radius-2xl)]">
        <div className="hidden md:block">
          <ConversationList conversations={rows} activeId={id} query={query} onQuery={setQuery} currentUserId={session?.user?.id} />
        </div>
        <ChatThread conversationId={id} />
      </div>
    </PageTransition>
  );
}
