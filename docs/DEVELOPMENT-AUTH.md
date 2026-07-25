# Development authentication

Relune can test Email and Phone authentication locally without sending real
email or SMS.

## Local setup

Use `.env.development.local`:

```bash
MAIL_PROVIDER=log
SMS_PROVIDER=log
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

This file is gitignored. Restart `npm run dev` after changing environment
values.

### Email accounts

1. Choose **Continue with Email** and create an account.
2. The check-email screen displays a development verification link.
3. Open the link, then sign in with the account password.

### Phone accounts

1. Choose **Continue with Phone** and create an account.
2. The OTP form displays the development SMS code.
3. Enter the code to finish registration or sign in.

Development tokens and codes are returned only when `NODE_ENV` is not
`production`.

## Automated checks

With the development server running:

```bash
npm run test:auth:email
npm run test:auth:phone
npm run test:realtime
QA_CLEANUP=1 npm run test:prelaunch
npm test
npm run typecheck
```

The realtime probe uses two authenticated users to verify message delivery,
call invitations, notifications, call acceptance, WebRTC signaling relay, and
call termination. The prelaunch probe covers account creation, sign-in, posts,
direct messages, notifications, permissions, and public pages. The critical
probe additionally covers photo upload and media posts, but should be run
independently because it performs a broader and slower crawl:

```bash
npm run test:critical
```

Calls require a manual two-browser test because WebRTC needs two authenticated
peers and microphone/camera permission:

1. Sign in as different users in two browser profiles.
2. Open a direct conversation.
3. Start voice and video calls in both directions.
4. Verify incoming-call, accept, reject, mute, camera, hang-up, and reconnect.
5. Test once on separate networks with production TURN configured.

## Production switch

Production is fail-closed. Set real delivery providers:

```bash
NODE_ENV=production
MAIL_PROVIDER=resend
RESEND_API_KEY=re_...
MAIL_FROM="Relune <noreply@yourdomain.com>"
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM=+15551234567
```

The production environment schema rejects `MAIL_PROVIDER=log`,
`SMS_PROVIDER=log`, or missing delivery credentials.
