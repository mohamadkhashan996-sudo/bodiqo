# Phase 7 — Premium Authentication

Relune supports two sign-in methods only:

1. Email & password
2. Phone OTP

## User experience

- Premium `/sign-in` with Email and Phone buttons
- Forgot Password, Create New Account, Remember Me
- Email verification, password reset, 2FA, sessions, trusted devices, login history, logout-all

## Environment

See `.env.example` for email and SMS delivery configuration.

## Admin

`/admin/auth` — authentication methods, 30-day auth stats, successful login history, failed attempts.

## APIs

| Route                 | Purpose                    |
| --------------------- | -------------------------- |
| `GET /api/admin/auth` | Admin authentication stats |

## Testing checklist

- [ ] Email registration + sign-in
- [ ] Password reset + email verification
- [ ] Phone registration + sign-in
- [ ] Remember Me session length
- [ ] Logout from all devices
