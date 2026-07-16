/**
 * Relune intelligence layer — heuristic AI assistance.
 * Designed to swap in LLM providers without changing API contracts.
 */

const STOP = new Set([
  "the", "and", "for", "with", "this", "that", "from", "your", "have", "been",
  "are", "was", "were", "will", "just", "about", "into", "over", "under",
]);

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s#]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

export function suggestCaption(seed?: string) {
  const base = seed?.trim();
  const options = base
    ? [
        `${base} — a quiet frame worth keeping.`,
        `Still here: ${base}`,
        `${base}. Soft light, clear presence.`,
      ]
    : [
        "Golden hour found me again.",
        "Small rituals, shared gently.",
        "A pause between everything loud.",
        "Building in public, softly.",
      ];
  return { suggestions: options };
}

export function suggestHashtags(text: string) {
  const words = tokens(text).slice(0, 8);
  const tags = new Set<string>(["#presence", "#relune"]);
  for (const w of words) {
    if (w.startsWith("#")) tags.add(w);
    else tags.add(`#${w.replace(/^#+/, "")}`);
  }
  if (/(photo|camera|light)/i.test(text)) tags.add("#photography");
  if (/(design|ui|brand)/i.test(text)) tags.add("#design");
  if (/(music|song)/i.test(text)) tags.add("#music");
  if (/(code|build|ship)/i.test(text)) tags.add("#makers");
  return { hashtags: [...tags].slice(0, 10) };
}

export function suggestComment(postBody: string) {
  const short = postBody.slice(0, 60);
  return {
    suggestions: [
      "This lands softly — thank you for sharing.",
      "The atmosphere here is unreal.",
      short ? `Love how present this feels: “${short}${postBody.length > 60 ? "…" : ""}”` : "Beautiful presence.",
    ],
  };
}

export function detectSpamSignals(text: string) {
  const reasons: string[] = [];
  const urls = text.match(/https?:\/\//gi)?.length ?? 0;
  if (urls >= 3) reasons.push("many_links");
  if (/(free money|crypto giveaway|click here now|earn \$\$\$)/i.test(text)) {
    reasons.push("scam_phrases");
  }
  if (/(.)\1{6,}/.test(text)) reasons.push("repeated_chars");
  if (text === text.toUpperCase() && text.length > 40) reasons.push("shouting");
  const score = Math.min(100, reasons.length * 28);
  return {
    spamLikely: score >= 50,
    score,
    reasons,
    assistance: score >= 50 ? "Flag for moderation review" : "Looks clean",
  };
}

export function detectFakeAccountSignals(input: {
  trustScore: number;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  emailVerified: boolean;
  createdAt: Date;
}) {
  const reasons: string[] = [];
  const ageHours = (Date.now() - input.createdAt.getTime()) / 36e5;
  if (!input.emailVerified) reasons.push("unverified_email");
  if (ageHours < 24 && input.followingCount > 80) reasons.push("burst_follows");
  if (input.followingCount > 200 && input.followersCount < 5) reasons.push("follow_ratio");
  if (input.postsCount === 0 && input.followingCount > 50) reasons.push("empty_burst");
  if (input.trustScore < 40) reasons.push("low_trust");
  const score = Math.min(100, reasons.length * 22 + (100 - input.trustScore) / 4);
  return {
    fakeLikely: score >= 55,
    score: Math.round(score),
    reasons,
    assistance: score >= 55 ? "Review account authenticity" : "Signals look normal",
  };
}

export function smartSearchExpand(query: string) {
  const q = query.trim();
  const expansions = new Set<string>([q]);
  if (/photo|pic/i.test(q)) expansions.add("photography");
  if (/dev|code|build/i.test(q)) expansions.add("technology");
  if (/food|cook/i.test(q)) expansions.add("food");
  if (/travel|trip/i.test(q)) expansions.add("travel");
  if (/music|song/i.test(q)) expansions.add("music");
  return { query: q, expansions: [...expansions] };
}

export function translateAssist(text: string, targetLocale: string) {
  // Stub: returns structured payload ready for an LLM translator
  return {
    sourceText: text,
    targetLocale,
    translatedText: text,
    note: "Connect an LLM translator for production multilingual output.",
  };
}

export function trendingPrediction(topics: Array<{ tag: string; count: number }>) {
  return topics
    .map((t) => ({
      ...t,
      predictedGrowth: Math.round(t.count * (1.1 + (t.tag.length % 5) * 0.05)),
    }))
    .sort((a, b) => b.predictedGrowth - a.predictedGrowth);
}
