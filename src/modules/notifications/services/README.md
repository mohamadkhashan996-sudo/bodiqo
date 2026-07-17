# Notifications

In-app + push notifications for Relune activity.

## Types wired

| Type | Trigger |
|------|---------|
| `LIKE` | Post like |
| `COMMENT` / `REPLY` | Comment on post / reply to comment (author + parent commenter) |
| `MENTION` | `@handle` in posts or comments |
| `FOLLOW` | New follower / accepted friend request |
| `FRIEND_REQUEST` | Incoming friend request |
| `MESSAGE` | New chat message (deep-links to conversation) |
| `SHARE` | Post share |
| `STORY_REPLY` | Story reaction |
| `CALL` / `MISSED_CALL` | Voice/video calls |

## Flow

1. `createNotification` persists + emits Socket.IO `notification:new` + Web Push fanout
2. `/api/notifications` list / mark read; `/api/notifications/unread` badge count
3. `/api/notifications/push` VAPID subscribe/unsubscribe
4. UI: `/notifications` page + nav bell badge + `PushOptIn`

## Push setup

Set `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (see `.env.example`). Users enable push on the notifications page. Service worker: `/sw.js` (push-only).
