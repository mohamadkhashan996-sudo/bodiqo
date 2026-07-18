# Complete authentication (production)

Relune authentication covers email, phone, OAuth, 2FA, sessions, and recovery.

## Sign-in methods

1. Google / Apple / Facebook / X (env-gated)
2. Email & password (+ authenticator/recovery code when 2FA on)
3. Phone OTP (verified phone numbers)

## Security features

| Feature                 | Status                             |
| ----------------------- | ---------------------------------- |
| Email verification      | Yes                                |
| Password reset          | Yes + session revoke               |
| Strong password hashing | bcrypt 12 + complexity rules       |
| Phone verification      | Yes (Twilio or log)                |
| Phone login             | Yes                                |
| TOTP 2FA                | Yes (pending secret until confirm) |
| Recovery codes          | Yes (hashed at rest)               |
| OAuth 2FA challenge     | Yes (`/sign-in/2fa`)               |
| Session versioning      | Yes (logout-all / password change) |
| Device sessions         | Yes                                |
| Trusted devices         | Yes (enroll + alerts skip)         |
| Login history           | Yes (IP + UA)                      |
| Security alert emails   | Yes                                |
| Account lockout         | Yes (10 failures → 15m)            |
| Account linking         | Yes                                |

## Key routes

- `/sign-in`, `/sign-up`, `/sign-in/2fa`
- `/forgot-password`, `/reset-password`, `/verify-email`
- `/link-account`
- Settings → Security (password, phone, 2FA, recovery)

## APIs

`/api/auth/phone/*`, `/api/auth/2fa/*`, `/api/auth/password`, `/api/auth/challenge`, sessions, trusted-devices, login-history, accounts

## Env

See `.env.example` for OAuth, `MAIL_*`, `SMS_*`, `REDIS_URL`.
