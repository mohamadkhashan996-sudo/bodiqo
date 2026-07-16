# Cirqua Phase 3

Phase 3 adds the private layer of Cirqua:

- A live split-inbox and thread UI with replies, reactions, message actions, typing, delivery states, image URLs, and MediaRecorder voice notes.
- Socket-backed online presence, messaging events, call invitations, and a floating call panel with device controls.
- Call history at `/calls`.
- Community discovery, join/leave flows, community publishing, member/rules panels, and media galleries.
- Full audience and messaging privacy controls at `/settings/privacy`.

## Run locally

The development command uses Cirqua's custom Socket.io server:

```bash
npm run dev
```

Ensure `DATABASE_URL` and `AUTH_SECRET` are set, generate Prisma client if needed with `npm run db:generate`, then seed Phase 3 sample data with `npm run db:seed:phase3`.
