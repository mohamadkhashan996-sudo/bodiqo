# Future expansion

Relune’s modular layout (`src/modules/*`, thin routes, Prisma models) is designed to grow without a rewrite.

| Capability                                 | Suggested approach                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Android / iPhone                           | Capacitor shells ship Relune 1.0 (`docs/MOBILE.md`); later React Native/Flutter can reuse REST + Socket.io      |
| Desktop                                    | Electron/Tauri wrapping web or native shell                                                                     |
| Live streaming                             | Separate media SFU (LiveKit/mediasoup) + `LiveSession` model; keep signaling off the main API process if needed |
| Marketplace                                | New `commerce` module + Stripe Connect; isolate from social write paths                                         |
| Creator monetization / subscriptions       | Billing provider + `CreatorPlan` / entitlement checks in services                                               |
| Advertising                                | Ad inventory module with strict separation from organic ranking                                                 |
| Verified organizations / business accounts | Extend verification + org membership tables; reuse admin verification queue                                     |
| Public API                                 | Versioned `/api/v1` with API keys, OAuth2, stricter rate limits                                                 |
| Third-party integrations                   | Webhooks outbound + signed inbound handlers in `src/modules/integrations`                                       |
| Deeper AI                                  | Swap `src/modules/ai` heuristics for LLM/provider adapters without changing route contracts                     |

Keep domain logic in services, not React components, so mobile and public API can share the same rules.
