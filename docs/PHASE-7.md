# Phase 7 — Premium Authentication

Relune supports five sign-in methods only:

1. Google  
2. Apple  
3. Facebook  
4. X (Twitter)  
5. Email & password  

GitHub and Microsoft were removed. Admins can enable/disable any provider under **Admin → Auth**.

## User experience

- Premium `/sign-in` with large provider buttons in the order above  
- Forgot Password, Create New Account, Remember Me  
- Secure account linking when OAuth email matches an existing password account (`/link-account`)  
- Connected accounts in **Settings → Connected accounts** (connect / disconnect)  
- Email verification, password reset, 2FA, sessions, trusted devices, login history, logout-all  

## Environment

See `.env.example`:

```bash
AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
AUTH_APPLE_ID / AUTH_APPLE_SECRET
AUTH_FACEBOOK_ID / AUTH_FACEBOOK_SECRET
AUTH_TWITTER_ID / AUTH_TWITTER_SECRET   # or AUTH_X_ID / AUTH_X_SECRET
```

Unconfigured providers remain visible but inactive with a friendly message (no stack traces).

## Admin

`/admin/auth` — provider toggles, 30-day auth stats, successful login history, failed attempts.

## APIs

| Route | Purpose |
|-------|---------|
| `GET /api/auth/providers-config` | Public provider availability |
| `GET/DELETE/POST /api/auth/accounts` | List / unlink / confirm link |
| `GET /api/auth/link-account?token=` | Pending link preview |
| `GET/PATCH /api/admin/auth` | Admin flags + stats |

## Testing checklist

- [ ] Email registration + sign-in  
- [ ] Password reset + email verification  
- [ ] Remember Me session length  
- [ ] OAuth (each configured provider)  
- [ ] Same-email OAuth → password account linking  
- [ ] Connect / disconnect in settings  
- [ ] Logout from all devices  
- [ ] Admin enable/disable providers  
