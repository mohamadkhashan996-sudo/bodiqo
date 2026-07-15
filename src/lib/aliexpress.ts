import { slugify } from "@/lib/catalog-types";

export type AliExpressParseResult = {
  productId: string | null;
  canonicalUrl: string;
  title: string;
  description: string;
  images: string[];
  price: number | null;
  currency: string;
  rawHost: string;
};

/** Extract numeric AliExpress item id from common URL shapes. */
export function extractAliExpressProductId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const patterns = [
      /\/item\/(\d+)\.html/i,
      /\/i\/(\d+)\.html/i,
      /[?&]productId=(\d+)/i,
      /\/(\d+)\.html/i,
    ];
    for (const re of patterns) {
      const m = u.href.match(re);
      if (m?.[1]) return m[1];
    }
    return null;
  } catch {
    const m = url.match(/(\d{10,})/);
    return m?.[1] ?? null;
  }
}

function decodeHtml(html: string) {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, property: string) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i",
  );
  return decodeHtml(html.match(re)?.[1] || html.match(alt)?.[1] || "");
}

/**
 * Fetch public metadata from an AliExpress product URL.
 * AliExpress frequently blocks scrapers — we always return a usable stub
 * with the supplier link even when HTML fetch fails.
 */
export async function importFromAliExpressUrl(
  inputUrl: string,
): Promise<AliExpressParseResult> {
  const productId = extractAliExpressProductId(inputUrl);
  let canonicalUrl = inputUrl.trim();
  if (productId) {
    canonicalUrl = `https://www.aliexpress.com/item/${productId}.html`;
  }

  const fallback: AliExpressParseResult = {
    productId,
    canonicalUrl,
    title: productId
      ? `AliExpress product ${productId}`
      : "Imported AliExpress product",
    description:
      "Imported from AliExpress. Edit title, description, images, and pricing in admin before publishing.",
    images: [],
    price: null,
    currency: "USD",
    rawHost: "aliexpress.com",
  };

  try {
    const res = await fetch(canonicalUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    if (!res.ok) return fallback;
    const html = await res.text();

    const title =
      metaContent(html, "og:title") ||
      decodeHtml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "") ||
      fallback.title;

    const description =
      metaContent(html, "og:description") ||
      metaContent(html, "description") ||
      fallback.description;

    const ogImage = metaContent(html, "og:image");
    const images = ogImage ? [ogImage] : [];

    // Best-effort price sniff (often unavailable when blocked)
    const priceMatch =
      html.match(/"price"\s*:\s*"?(\d+(\.\d+)?)"?/i) ||
      html.match(/itemprop=["']price["'][^>]*content=["'](\d+(\.\d+)?)["']/i);
    const price = priceMatch ? Number(priceMatch[1]) : null;

    return {
      productId,
      canonicalUrl,
      title: title.slice(0, 200),
      description: description.slice(0, 4000) || fallback.description,
      images,
      price: Number.isFinite(price) ? price : null,
      currency: "USD",
      rawHost: new URL(canonicalUrl).hostname,
    };
  } catch {
    return fallback;
  }
}

export function suggestedSku(productId: string | null) {
  return `AE-${productId || Date.now().toString(36).toUpperCase()}`;
}

export function suggestedSlug(title: string, productId: string | null) {
  const base = slugify(title) || "aliexpress-product";
  const suffix = productId
    ? `-${productId.slice(-6)}`
    : `-${Date.now().toString(36)}`;
  return `${base}${suffix}`.slice(0, 80);
}

/** Apply markup to cost → retail price. */
export function priceFromCost(cost: number, markupPercent: number) {
  if (!Number.isFinite(cost) || cost <= 0) return 0;
  return Math.round(cost * (1 + markupPercent / 100) * 100) / 100;
}
