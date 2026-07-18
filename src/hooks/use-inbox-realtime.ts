"use client";

import { type Dispatch, type SetStateAction, useEffect } from "react";

import type { ConversationRow } from "@/components/messaging/conversation-list";
import { useSocket } from "@/hooks/use-socket";

type InboxMessage = {
  id: string;
  body?: string;
  type?: string;
  mediaUrl?: string | null;
  isEncrypted?: boolean;
  createdAt?: string;
  conversationId?: string;
  senderId?: string;
};

function messagePreviewFromInbox(message: InboxMessage) {
  if (message.isEncrypted) return "Encrypted message";
  const body = message.body?.trim();
  if (body) return body;
  switch (message.type) {
    case "IMAGE":
      return "Photo";
    case "VIDEO":
      return "Video";
    case "AUDIO":
      return "Voice note";
    case "FILE":
    case "DOCUMENT":
      return "File";
    default:
      return "New message";
  }
}

/** Keep conversation list previews + unread badges live. */
export function useInboxRealtime(
  setRows: Dispatch<SetStateAction<ConversationRow[]>>,
  currentUserId?: string,
  activeConversationId?: string,
) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const onPresence = ({
      userId,
      status,
    }: {
      userId: string;
      status: string;
    }) => {
      setRows((rows) =>
        rows.map((row) => ({
          ...row,
          conversation: {
            ...row.conversation,
            members: row.conversation.members.map((member) =>
              member.userId === userId
                ? {
                    ...member,
                    user: { ...member.user, presence: status },
                  }
                : member,
            ),
          },
        })),
      );
    };

    const onConversationUpdated = ({
      conversationId,
      message,
      senderId,
    }: {
      conversationId: string;
      message: InboxMessage;
      senderId: string;
    }) => {
      setRows((rows) => {
        const idx = rows.findIndex(
          (row) => row.conversation.id === conversationId,
        );
        if (idx < 0) {
          void fetch("/api/conversations")
            .then((r) => r.json())
            .then((d: { conversations?: ConversationRow[] }) => {
              if (d.conversations) setRows(d.conversations);
            });
          return rows;
        }
        const row = rows[idx];
        if (!row) return rows;
        const preview: ConversationRow["conversation"]["messages"][number] = {
          body: messagePreviewFromInbox(message),
          createdAt: message.createdAt || new Date().toISOString(),
          type: message.type,
          isEncrypted: message.isEncrypted,
          mediaUrl: message.mediaUrl,
        };
        const bumpUnread =
          senderId &&
          senderId !== currentUserId &&
          conversationId !== activeConversationId;
        const next: ConversationRow = {
          ...row,
          unreadCount: bumpUnread ? row.unreadCount + 1 : row.unreadCount,
          conversation: {
            ...row.conversation,
            messages: [preview],
          },
        };
        const rest = rows.filter((_, i) => i !== idx);
        return [next, ...rest];
      });
    };

    socket.on("presence:changed", onPresence);
    socket.on("conversation:updated", onConversationUpdated);
    return () => {
      socket.off("presence:changed", onPresence);
      socket.off("conversation:updated", onConversationUpdated);
    };
  }, [socket, setRows, currentUserId, activeConversationId]);
}
