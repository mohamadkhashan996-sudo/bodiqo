"use client";

import { Check, CheckCheck, MoreHorizontal, Reply, Smile } from "lucide-react";

export type ChatMessage = { id: string; conversationId: string; body: string; mediaUrl: string | null; type: string; senderId: string; createdAt: string; delivery: "SENT" | "DELIVERED" | "SEEN"; isEdited: boolean; deletedForAll: boolean; sender: { id: string; name: string | null; displayName?: string | null; handle: string | null; image: string | null }; replyTo?: { body: string; sender: { name: string | null; handle: string | null } } | null; reactions: { emoji: string; userId: string }[] };

export function MessageBubble({ message, mine, onReply, onReact, onEdit, onDelete }: { message: ChatMessage; mine: boolean; onReply: () => void; onReact: (emoji: string) => void; onEdit: () => void; onDelete: () => void }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return <div className={`group flex ${mine ? "justify-end" : "justify-start"}`}><div className={`relative max-w-[82%] rounded-[1.4rem] px-4 py-3 ${mine ? "rounded-br-md bg-[var(--ink)] text-[var(--cloud)]" : "rounded-bl-md bg-white/80 text-[var(--ink)] shadow-sm"}`}>
    {!mine && <p className="mb-1 text-[11px] font-bold text-[var(--signal)]">{message.sender.displayName ?? message.sender.name ?? message.sender.handle}</p>}
    {message.replyTo && <div className={`mb-2 border-l-2 pl-2 text-xs ${mine ? "border-[var(--ember)] text-white/60" : "border-[var(--signal)] text-[var(--muted)]"}`}>Replying to {message.replyTo.sender.name ?? message.replyTo.sender.handle}: {message.replyTo.body}</div>}
    {message.deletedForAll ? <p className="italic opacity-60">This message was removed.</p> : <>{message.mediaUrl && <img src={message.mediaUrl} alt="" className="mb-2 max-h-64 rounded-xl object-cover" />}{message.body && <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>}</>}
    <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "justify-end text-white/55" : "text-[var(--muted)]"}`}><span>{message.isEdited && "edited · "}{time}</span>{mine && (message.delivery === "SEEN" ? <CheckCheck className="size-3 text-[var(--ember)]" /> : <Check className="size-3" />)}</div>
    {message.reactions.length > 0 && <div className={`absolute -bottom-3 ${mine ? "right-2" : "left-2"} flex rounded-full bg-white px-2 py-0.5 text-xs shadow`}>{[...new Set(message.reactions.map((reaction) => reaction.emoji))].join(" ")}</div>}
    <div className={`absolute -top-3 hidden gap-1 rounded-full bg-white p-1 shadow-lg group-hover:flex ${mine ? "right-0" : "left-0"}`}><button onClick={onReply} aria-label="Reply" className="p-1 text-[var(--muted)]"><Reply className="size-3" /></button><button onClick={() => onReact("✨")} aria-label="React" className="p-1 text-[var(--muted)]"><Smile className="size-3" /></button>{mine && <button onClick={onEdit} aria-label="Edit" className="p-1 text-[var(--muted)]"><MoreHorizontal className="size-3" /></button>}<button onClick={onDelete} aria-label="Delete" className="p-1 text-[var(--muted)]"><MoreHorizontal className="size-3" /></button></div>
  </div></div>;
}
