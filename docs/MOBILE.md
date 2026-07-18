# Mobile builds (iOS & Android)

Relune’s native apps are **Capacitor shells** that load the production web app
(`server.ts` + Next.js + Socket.IO). This keeps realtime, auth cookies, and
WebRTC on one codebase.

## Prerequisites

- Production web deployed over **HTTPS**
- Node 20+, Xcode 15+ (iOS), Android Studio / SDK 34+ (Android)
- Apple Developer + Google Play accounts for store release

## One-time setup

```bash
npm ci
# Android (any OS with Android Studio):
npx cap add android
# iOS (macOS + Xcode + CocoaPods):
npx cap add ios
export CAPACITOR_SERVER_URL=https://your.production.domain
npm run mobile:sync
```

> If `npx cap add ios` errors on CocoaPods, install with Homebrew (`brew install cocoapods`) then retry.
> Apply camera / mic / photos strings from `mobile/NATIVE_PERMISSIONS.md`.

## Daily / release sync

```bash
export CAPACITOR_SERVER_URL=https://your.production.domain
npm run mobile:sync
npm run mobile:open:ios      # Xcode
npm run mobile:open:android  # Android Studio
```

## iOS release

1. Open workspace in Xcode (`ios/App/App.xcworkspace`)
2. Set Team, bundle id `app.relune.social`, version/build
3. Signing → Release, archive
4. Distribute to App Store Connect / TestFlight
5. Privacy nutrition labels: camera, mic, photos, tracking (if analytics on)
6. Universal Links: host `/.well-known/apple-app-site-association` (replace `TEAMID`)

## Android release

1. Open `android/` in Android Studio
2. Generate upload keystore (store securely; never commit)
3. `Build → Generate Signed Bundle / APK` → AAB for Play
4. Digital Asset Links: update `public/.well-known/assetlinks.json` SHA-256
5. Target API level per Play policy; enable notifications permission prompt on 13+

## Local web debugging in the shell

Point at a machine-reachable origin (not `localhost` from a physical device):

```bash
export CAPACITOR_SERVER_URL=http://192.168.1.20:3000
npm run mobile:sync
```

`cleartext` is enabled automatically when the URL is `http://`.

## Store checklist

- [ ] Production AUTH_URL matches shell URL
- [ ] Push VAPID configured (web push inside WKWebView / Chrome WebView)
- [ ] Calls: TURN credentials for cellular NATs
- [ ] App icons / splash use Relune brand assets under `public/brand/`
- [ ] Age rating / community guidelines linked from Settings

## Why not a separate React Native app?

Domain logic already lives in `src/modules/*`. The Capacitor shell ships the
same product immediately; a fully native client can still consume the same
REST + Socket.IO contracts later (see `docs/FUTURE.md`).
