/**
 * Relune intelligence layer — heuristic AI assistance.
 * Swap in an LLM via AI_PROVIDER without changing API contracts.
 */

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "your",
  "have",
  "been",
  "are",
  "was",
  "were",
  "will",
  "just",
  "about",
  "into",
  "over",
  "under",
  "you",
  "but",
  "not",
  "all",
  "can",
  "her",
  "his",
  "she",
  "him",
  "they",
  "them",
]);

const SEARCH_SYNONYMS: Record<string, string[]> = {
  photo: ["photography", "camera", "picture", "image"],
  pic: ["photography", "picture", "image"],
  pics: ["photography", "pictures"],
  dev: ["developer", "code", "programming", "technology"],
  code: ["programming", "developer", "build"],
  build: ["maker", "ship", "launch"],
  food: ["cooking", "recipe", "cuisine"],
  cook: ["cooking", "food", "recipe"],
  travel: ["trip", "journey", "wander"],
  trip: ["travel", "journey"],
  music: ["song", "playlist", "audio"],
  song: ["music", "track"],
  design: ["ui", "brand", "creative"],
  ui: ["design", "interface"],
  fitness: ["workout", "gym", "health"],
  workout: ["fitness", "gym"],
  art: ["creative", "illustration", "drawing"],
  video: ["clip", "film", "short"],
  short: ["shorts", "reel", "clip"],
  news: ["update", "headline"],
  love: ["heart", "romance"],
  tech: ["technology", "gadgets", "software"],
};

const TOXIC_PATTERNS: Array<{ re: RegExp; label: string; weight: number }> = [
  { re: /\b(kill yourself|kys)\b/i, label: "self_harm_threat", weight: 45 },
  { re: /\b(i('ll| will) (kill|hurt) you)\b/i, label: "direct_threat", weight: 50 },
  { re: /\b(nigger|faggot|retard)\b/i, label: "slur", weight: 55 },
  {
    re: /\b(stupid (bitch|whore|slut)|go die|hope you die)\b/i,
    label: "severe_insult",
    weight: 40,
  },
  { re: /\b(rape|molest)\b/i, label: "sexual_violence", weight: 50 },
  {
    re: /\b(terrorist|bomb threat|school shooter)\b/i,
    label: "violent_extremism",
    weight: 45,
  },
  { re: /\b(hate (all|every) (women|men|jews|muslims|gays))\b/i, label: "hate", weight: 42 },
];

const SPAM_PATTERNS: Array<{ re: RegExp; label: string; weight: number }> = [
  { re: /free money|crypto giveaway|click here now|earn \$\$\$/i, label: "scam_phrases", weight: 35 },
  { re: /whatsapp\s*\+?\d|telegram\s*@|dm me for (cash|profit)/i, label: "outreach_scam", weight: 30 },
  { re: /limited offer|act now|double your (money|btc)/i, label: "urgency_scam", weight: 28 },
  { re: /\b(viagra|cialis|casino bonus)\b/i, label: "promo_spam", weight: 32 },
];

export function tokens(text: string) {
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
      short
        ? `Love how present this feels: “${short}${postBody.length > 60 ? "…" : ""}”`
        : "Beautiful presence.",
    ],
  };
}

export function detectSpamSignals(text: string) {
  const reasons: string[] = [];
  let score = 0;
  const urls = text.match(/https?:\/\//gi)?.length ?? 0;
  if (urls >= 3) {
    reasons.push("many_links");
    score += 30;
  } else if (urls >= 2) {
    reasons.push("multiple_links");
    score += 16;
  }
  for (const rule of SPAM_PATTERNS) {
    if (rule.re.test(text)) {
      reasons.push(rule.label);
      score += rule.weight;
    }
  }
  if (/(.)\1{6,}/.test(text)) {
    reasons.push("repeated_chars");
    score += 22;
  }
  if (text === text.toUpperCase() && text.length > 40) {
    reasons.push("shouting");
    score += 18;
  }
  const words = text.trim().split(/\s+/);
  if (words.length >= 8) {
    const unique = new Set(words.map((w) => w.toLowerCase()));
    if (unique.size / words.length < 0.35) {
      reasons.push("word_stuffing");
      score += 24;
    }
  }
  const mentions = text.match(/@\w+/g)?.length ?? 0;
  if (mentions >= 8) {
    reasons.push("mention_spam");
    score += 26;
  }
  score = Math.min(100, score);
  return {
    spamLikely: score >= 50,
    score,
    reasons,
    assistance:
      score >= 50
        ? "Flag for moderation review"
        : score >= 30
          ? "Mild spam signals — review if reported"
          : "Looks clean",
  };
}

export function detectToxicity(text: string) {
  const reasons: string[] = [];
  let score = 0;
  for (const rule of TOXIC_PATTERNS) {
    if (rule.re.test(text)) {
      reasons.push(rule.label);
      score += rule.weight;
    }
  }
  const insults = text.match(/\b(idiot|moron|dumbass|asshole|bastard)\b/gi)?.length ?? 0;
  if (insults >= 3) {
    reasons.push("insult_cluster");
    score += 28;
  } else if (insults >= 1) {
    reasons.push("mild_insult");
    score += 12;
  }
  if (/[🤬🖕]/.test(text)) {
    reasons.push("hostile_emoji");
    score += 10;
  }
  score = Math.min(100, score);
  return {
    toxicLikely: score >= 45,
    score,
    reasons,
    categories: reasons,
    assistance:
      score >= 45
        ? "Toxic language detected — block or escalate"
        : score >= 25
          ? "Borderline tone — monitor"
          : "Tone looks okay",
  };
}

/** Normalize text for near-duplicate comparison. */
export function normalizeForDuplicate(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fingerprintText(text: string) {
  const norm = normalizeForDuplicate(text);
  let hash = 2166136261;
  for (let i = 0; i < norm.length; i++) {
    hash ^= norm.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

/** Jaccard similarity on token sets (0–1). */
export function textSimilarity(a: string, b: string) {
  const ta = new Set(tokens(normalizeForDuplicate(a)));
  const tb = new Set(tokens(normalizeForDuplicate(b)));
  if (!ta.size && !tb.size) return 1;
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

export function detectDuplicateSignals(
  candidate: string,
  priorBodies: string[],
  threshold = 0.82,
) {
  const norm = normalizeForDuplicate(candidate);
  if (norm.length < 12) {
    return {
      duplicateLikely: false,
      score: 0,
      bestMatch: null as string | null,
      similarity: 0,
      fingerprint: fingerprintText(candidate),
      assistance: "Too short to judge duplicates",
    };
  }
  let best = 0;
  let bestMatch: string | null = null;
  const fp = fingerprintText(candidate);
  for (const prior of priorBodies) {
    if (fingerprintText(prior) === fp) {
      return {
        duplicateLikely: true,
        score: 100,
        bestMatch: prior.slice(0, 120),
        similarity: 1,
        fingerprint: fp,
        assistance: "Exact duplicate of a recent post",
      };
    }
    const sim = textSimilarity(candidate, prior);
    if (sim > best) {
      best = sim;
      bestMatch = prior.slice(0, 120);
    }
  }
  const score = Math.round(best * 100);
  return {
    duplicateLikely: best >= threshold,
    score,
    bestMatch,
    similarity: best,
    fingerprint: fp,
    assistance:
      best >= threshold
        ? "Near-duplicate of recent content"
        : "No close duplicates found",
  };
}

export function scoreContentModeration(text: string) {
  const spam = detectSpamSignals(text);
  const toxicity = detectToxicity(text);
  const riskScore = Math.min(100, Math.max(spam.score, toxicity.score));
  const categories: string[] = [];
  if (spam.spamLikely) categories.push("SPAM");
  if (toxicity.reasons.some((r) => r.includes("hate") || r === "slur")) {
    categories.push("HARASSMENT");
  }
  if (toxicity.reasons.some((r) => r.includes("threat") || r.includes("violence"))) {
    categories.push("VIOLENCE");
  }
  if (toxicity.toxicLikely && !categories.includes("HARASSMENT")) {
    categories.push("HARASSMENT");
  }
  return {
    riskScore,
    recommendEscalate: riskScore >= 70,
    recommendBlock: riskScore >= 85 || toxicity.score >= 70 || spam.score >= 70,
    categories: categories.length ? categories : (["OTHER"] as string[]),
    spam,
    toxicity,
    summary:
      riskScore >= 70
        ? "High risk — escalate for human review"
        : riskScore >= 40
          ? "Medium risk — monitor"
          : "Low risk",
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
  if (input.followingCount > 200 && input.followersCount < 5) {
    reasons.push("follow_ratio");
  }
  if (input.postsCount === 0 && input.followingCount > 50) {
    reasons.push("empty_burst");
  }
  if (input.trustScore < 40) reasons.push("low_trust");
  const score = Math.min(
    100,
    reasons.length * 22 + (100 - input.trustScore) / 4,
  );
  return {
    fakeLikely: score >= 55,
    score: Math.round(score),
    reasons,
    assistance:
      score >= 55 ? "Review account authenticity" : "Signals look normal",
  };
}

export function smartSearchExpand(query: string) {
  const q = query.trim();
  const expansions = new Set<string>([q]);
  const parts = q
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.replace(/^@/, "").replace(/^#/, ""))
    .filter(Boolean);

  for (const part of parts) {
    expansions.add(part);
    const syns = SEARCH_SYNONYMS[part];
    if (syns) for (const s of syns) expansions.add(s);
    for (const [key, values] of Object.entries(SEARCH_SYNONYMS)) {
      if (values.includes(part)) {
        expansions.add(key);
        for (const s of values) expansions.add(s);
      }
    }
  }

  if (/photo|pic/i.test(q)) expansions.add("photography");
  if (/dev|code|build/i.test(q)) expansions.add("technology");
  if (/food|cook/i.test(q)) expansions.add("food");
  if (/travel|trip/i.test(q)) expansions.add("travel");
  if (/music|song/i.test(q)) expansions.add("music");

  return {
    query: q,
    expansions: [...expansions].slice(0, 12),
    provider: process.env.AI_PROVIDER || "heuristic",
  };
}

export function translateAssist(text: string, targetLocale: string) {
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
