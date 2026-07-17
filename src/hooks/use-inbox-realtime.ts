"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useSocket } from "@/hooks/use-socket";
import type { ConversationRow } from "@/components/messaging/conversation-list";

type InboxMessage = {
  id: string;
  body?: string;
  createdAt?: string;
  conversationId?: string;
  senderId?: string;
};

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
        const preview = {
          body: message.body || "New message",
          createdAt: message.createdAt || new Date().toISOString(),
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
            messages: [
              preview as ConversationRow["conversation"]["messages"][0],
            ],
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
