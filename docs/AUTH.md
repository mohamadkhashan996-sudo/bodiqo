# Complete authentication (production)

Relune authentication covers email, phone, 2FA, sessions, and recovery.

## Sign-in methods

1. Email & password (+ authenticator/recovery code when 2FA on)
2. Phone OTP (verified phone numbers)

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
| Session versioning      | Yes (logout-all / password change) |
| Device sessions         | Yes                                |
| Trusted devices         | Yes (enroll + alerts skip)         |
| Login history           | Yes (IP + UA)                      |
| Security alert emails   | Yes                                |
| Account lockout         | Yes (10 failures → 15m)            |

## Key routes

- `/sign-in`, `/sign-up`, `/sign-in/2fa`
- `/forgot-password`, `/reset-password`, `/verify-email`
- Settings → Security (password, phone, 2FA, recovery)

## APIs

`/api/auth/phone/*`, `/api/auth/2fa/*`, `/api/auth/password`, `/api/auth/challenge`, sessions, trusted-devices, and login-history

## Env

See `.env.example` for `MAIL_*`, `SMS_*`, and `REDIS_URL`.
