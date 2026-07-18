export const site = {
  name: "Relune",
  tagline: "Presence, beautifully shared.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000",
} as const;
