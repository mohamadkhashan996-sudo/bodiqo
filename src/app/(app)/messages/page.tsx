"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageCircleHeart, Plus, Search, Users } from "lucide-react";
import { motion } from "framer-motion";
import {
  ConversationList,
  type ConversationRow,
} from "@/components/messaging/conversation-list";
import { PageTransition } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useInboxRealtime } from "@/hooks/use-inbox-realtime";

type SearchUser = {
  id: string;
  handle: string;
  displayName?: string | null;
  name?: string | null;
  image?: string | null;
};

type MessageHit = {
  id: string;
  body: string;
  conversationId: string;
  createdAt: string;
  sender: {
    displayName?: string | null;
    name: string | null;
    handle: string | null;
  };
};

export default function MessagesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [query, setQuery] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [dmQuery, setDmQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [dmResults, setDmResults] = useState<SearchUser[]>([]);
  const [selected, setSelected] = useState<SearchUser[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageHits, setMessageHits] = useState<MessageHit[]>([]);
  const [searchingMessages, setSearchingMessages] = useState(false);

  useEffect(() => {
    void fetch("/api/conversations")
      .then((response) => response.json())
      .then((data: { conversations?: ConversationRow[] }) =>
        setRows(data.conversations ?? []),
      );
  }, []);

  useInboxRealtime(setRows, session?.user?.id);

  useEffect(() => {
    if (!memberQuery.trim()) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(memberQuery)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.users ?? []));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [memberQuery]);

  useEffect(() => {
    if (!dmQuery.trim()) {
      setDmResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(dmQuery)}`)
        .then((r) => r.json())
        .then((d) => setDmResults(d.users ?? []));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [dmQuery]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setMessageHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearchingMessages(true);
      void fetch(`/api/messages/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => setMessageHits(d.messages ?? []))
        .finally(() => setSearchingMessages(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    if (!groupTitle.trim() || selected.length < 1) {
      setError("Add a title and at least one member.");
      return;
    }
    setCreating(true);
    setError(null);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "GROUP",
        title: groupTitle.trim(),
        memberIds: selected.map((u) => u.id),
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error || "Could not create group");
      return;
    }
    setGroupOpen(false);
    setGroupTitle("");
    setSelected([]);
    router.push(`/messages/${data.conversation.id}`);
  }

  async function startDm(userId: string) {
    setCreating(true);
    setError(null);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "DIRECT", userId }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error || "Could not start chat");
      return;
    }
    setDmOpen(false);
    setDmQuery("");
    router.push(`/messages/${data.conversation.id}`);
  }

  return (
    <PageTransition className="page-shell page-stack">
      <section className="glass-strong premium-ring hero-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="kicker">Private circle</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight sm:text-4xl md:text-5xl">
              Messages with softer edges.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Direct messages, group conversations, media, voice notes, and
              realtime receipts.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDmOpen(true)}
            >
              <Plus className="size-4" />
              New message
            </Button>
            <Button type="button" onClick={() => setGroupOpen(true)}>
              <Users className="size-4" />
              New group
            </Button>
          </div>
        </div>
      </section>
      <div className="surface-panel-strong flex min-h-[calc(100dvh-12rem)] overflow-hidden rounded-[var(--radius-2xl)] sm:min-h-[calc(100vh-14rem)]">
        <ConversationList
          conversations={rows}
          query={query}
          onQuery={setQuery}
          currentUserId={session?.user?.id}
          messageHits={messageHits}
          searchingMessages={searchingMessages}
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden flex-1 place-items-center p-10 md:grid"
        >
          <div className="max-w-sm text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-[2rem] bg-[var(--ink)] text-[var(--ember)] shadow-[var(--shadow-md)]">
              <MessageCircleHeart className="size-9" />
            </div>
            <h2 className="mt-6 font-[family-name:var(--font-display)] text-3xl">
              A quieter kind of close.
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Start a direct message, open a group, or search across your chats.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDmOpen(true)}
              >
                <Plus className="size-4" />
                New message
              </Button>
              <Button type="button" onClick={() => setGroupOpen(true)}>
                <Users className="size-4" />
                Create group
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      <Modal open={dmOpen} onClose={() => setDmOpen(false)} title="New message">
        <div className="space-y-4">
          <Input
            value={dmQuery}
            onChange={(e) => setDmQuery(e.target.value)}
            placeholder="Search people"
            autoFocus
          />
          {dmResults.length ? (
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {dmResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  disabled={creating}
                  className="flex w-full items-center justify-between rounded-[var(--radius-lg)] px-3 py-2 text-left text-sm hover:bg-[var(--mist)]/50"
                  onClick={() => void startDm(user.id)}
                >
                  <span>
                    {user.displayName ?? user.name}{" "}
                    <span className="text-[var(--muted)]">@{user.handle}</span>
                  </span>
                  <Plus className="size-4" />
                </button>
              ))}
            </div>
          ) : dmQuery.trim() ? (
            <p className="text-sm text-[var(--muted)]">No people found</p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Search className="size-4" />
              Find someone to message
            </p>
          )}
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        title="New group chat"
      >
        <form onSubmit={createGroup} className="space-y-4">
          <Input
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            placeholder="Group name"
            required
          />
          <Input
            value={memberQuery}
            onChange={(e) => setMemberQuery(e.target.value)}
            placeholder="Search people to add"
          />
          {results.length ? (
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-[var(--radius-lg)] px-3 py-2 text-left text-sm hover:bg-[var(--mist)]/50"
                  onClick={() => {
                    setSelected((old) =>
                      old.some((u) => u.id === user.id) ? old : [...old, user],
                    );
                  }}
                >
                  <span>
                    {user.displayName ?? user.name}{" "}
                    <span className="text-[var(--muted)]">@{user.handle}</span>
                  </span>
                  <Plus className="size-4" />
                </button>
              ))}
            </div>
          ) : null}
          {selected.length ? (
            <div className="flex flex-wrap gap-2">
              {selected.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="rounded-full bg-[var(--signal)]/15 px-3 py-1 text-xs font-semibold text-[var(--signal)]"
                  onClick={() =>
                    setSelected((old) => old.filter((u) => u.id !== user.id))
                  }
                >
                  @{user.handle} ×
                </button>
              ))}
            </div>
          ) : null}
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <Button type="submit" disabled={creating} className="w-full">
            {creating ? "Creating…" : "Create group"}
          </Button>
        </form>
      </Modal>
    </PageTransition>
  );
}
