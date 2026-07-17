# Notifications module

In-app notifications are created via `createNotification` (likes, comments, follows, messages, calls).

Delivery paths:
1. Persist `Notification` row
2. Emit Socket.IO `notification:new` to `user:{id}` for live badge/UI
3. Fan out Web Push to stored `PushSubscription` rows when VAPID is configured and admin `pushNotifications.enabled` is true

APIs:
- `GET/PATCH /api/notifications`
- `GET /api/notifications/unread`
- `GET/POST/DELETE /api/notifications/push`
