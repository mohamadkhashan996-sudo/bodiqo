"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ChatThread } from "@/components/messaging/chat-thread";
import {
  ConversationList,
  type ConversationRow,
} from "@/components/messaging/conversation-list";
import { PageTransition } from "@/components/motion/primitives";
import { useInboxRealtime } from "@/hooks/use-inbox-realtime";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [query, setQuery] = useState("");
  const [inbox, setInbox] = useState<"chats" | "requests" | "archived">(
    "chats",
  );

  useEffect(() => {
    const qs =
      inbox === "archived"
        ? "?archived=1"
        : inbox === "requests"
          ? "?requests=1"
          : "";
    void fetch(`/api/conversations${qs}`)
      .then((response) => response.json())
      .then((data: { conversations?: ConversationRow[] }) =>
        setRows(data.conversations ?? []),
      );
  }, [inbox]);

  useInboxRealtime(setRows, session?.user?.id, id);

  return (
    <PageTransition className="page-shell">
      <div className="surface-panel-strong flex h-dvh max-h-dvh min-h-0 overflow-hidden rounded-none sm:rounded-[var(--radius-2xl)] md:h-[calc(100dvh-6rem)] md:max-h-none md:min-h-[min(70dvh,36rem)] lg:h-[calc(100dvh-5rem)]">
        <div className="hidden min-w-0 shrink-0 md:block md:w-[22rem] md:max-w-[22rem]">
          <ConversationList
            conversations={rows}
            activeId={id}
            query={query}
            onQuery={setQuery}
            currentUserId={session?.user?.id}
            inbox={inbox}
            onInbox={setInbox}
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="border-b border-[color:color-mix(in_srgb,var(--mist)_75%,transparent)] px-3 py-2 md:hidden">
            <Link
              href="/messages"
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-[var(--muted-strong)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
            >
              <ArrowLeft className="size-4" />
              Inbox
            </Link>
          </div>
          <ChatThread conversationId={id} />
        </div>
      </div>
    </PageTransition>
  );
}
