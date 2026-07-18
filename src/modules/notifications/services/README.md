# Notifications

In-app + Web Push notifications for Relune activity.

## Types wired

| Type                   | Trigger                                                        | Category   |
| ---------------------- | -------------------------------------------------------------- | ---------- |
| `LIKE`                 | Post like (coalesced per actor/post while unread)              | social     |
| `COMMENT` / `REPLY`    | Comment on post / reply to comment                             | social     |
| `MENTION`              | `@handle` in posts or comments                                 | social     |
| `FOLLOW`               | New follower / accepted friend request                         | social     |
| `FRIEND_REQUEST`       | Incoming friend/follow request                                 | social     |
| `MESSAGE`              | New chat message (skipped if actively viewing conversation)    | messages   |
| `SHARE`                | Post share                                                     | social     |
| `STORY_REPLY`          | Story reaction                                                 | social     |
| `CALL` / `MISSED_CALL` | Voice/video calls                                              | calls      |
| `LIVE_STARTED` / gift  | Go-live fan-out / live gift                                    | live       |
| `GROUP` / `COMMUNITY`  | Invites                                                        | community  |
| `ANNOUNCEMENT`         | Product announcements (type ready; admin fan-out TBD)          | product    |
| `VERIFICATION`         | Verification updates                                           | security*  |

\*Security category always delivers.

## Flow

1. `createNotification` checks mute/block + `NotificationPreferences`, persists, emits Socket.IO `notification:new`, Web Push fanout (prefs + admin gate)
2. `/api/notifications` list / mark read / delete; `/api/notifications/unread` badge
3. `/api/notifications/preferences` GET/PATCH account-synced category toggles
4. `/api/notifications/push` VAPID subscribe/unsubscribe (endpoint ownership enforced)
5. UI: `/notifications` (read on open item, mark all, delete, pagination) + nav badge + Settings sync

## Push setup

Set `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (see `.env.example`). Users enable push on the notifications/settings page. Service worker: `/sw.js` (push-only).

## Not in scope yet

- Email digests for social activity (auth/security mail only)
- SMS notifications (OTP only)
- Native FCM/APNs
- Rewards notification domain
- Admin announcement publisher UI
