# Phase 5 — World-class UI · UX · AI · Branding · Global experience

## Brand decision: Relune

Cirqua was retired after automated research found **Garmin CIRQA** trademark filings across major markets. **Relune** (reh-LOON) won the Phase 5 naming comparison.

Manual checks still required before commercial launch: USPTO/EUIPO/WIPO, domains, store listings, handles, counsel.

Full guidelines: `docs/brand/BRAND.md`

## Design system
- Spacing, type, color, glass, radius, elevation tokens (`src/design-system/tokens.css`)
- Buttons, inputs, cards, empty/skeleton/state banners, lightbox
- Motion primitives with `prefers-reduced-motion` support

## Themes
Light / Dark / System — persisted to `localStorage` + user profile (`theme` field), applied via `ExperienceProvider`.

## Internationalization
22 locales with RTL for Arabic & Hebrew (`src/i18n/*`). Dictionaries cover brand + nav for all languages; English/Arabic deeper. New languages: add to `LOCALES` + overlay map.

## Accessibility
Skip link, focus rings, ARIA on tabs/filters/dialogs, high contrast + large text toggles in Settings.

## AI & smart feed
`/api/ai` — caption/hashtag/comment suggestions, spam & fake-account signals, smart search expand, trending prediction, personalized recommendations (interests + graph heuristics).

## Surfaces polished
- Landing splash + Relune hero
- Explore discovery (recommendations, hashtags, communities, videos)
- Profiles (animated header, real posts/media gallery + lightbox)
- Notifications (categories + mark all read)
- Settings (appearance, language, security, sessions, a11y)
- Composer AI assists + spam gate

## Quality notes
Heuristic AI is production-shaped for provider swap (LLM/translator). Full per-locale copy for every string can expand incrementally via the dictionary overlays.
