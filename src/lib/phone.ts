import {
  isSupportedCountry,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export type { CountryCode };

const STORAGE_KEY = "relune.phone.country";

/** Common IANA time zones → ISO country (first-visit detection fallback). */
const TIMEZONE_COUNTRY: Record<string, CountryCode> = {
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Mexico_City": "MX",
  "America/Sao_Paulo": "BR",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Bogota": "CO",
  "America/Lima": "PE",
  "America/Santiago": "CL",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Lisbon": "PT",
  "Europe/Zurich": "CH",
  "Europe/Vienna": "AT",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ",
  "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO",
  "Europe/Athens": "GR",
  "Europe/Istanbul": "TR",
  "Europe/Moscow": "RU",
  "Europe/Kyiv": "UA",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Kuwait": "KW",
  "Asia/Qatar": "QA",
  "Asia/Bahrain": "BH",
  "Asia/Muscat": "OM",
  "Asia/Jerusalem": "IL",
  "Asia/Amman": "JO",
  "Asia/Beirut": "LB",
  "Asia/Baghdad": "IQ",
  "Asia/Tehran": "IR",
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Dhaka": "BD",
  "Asia/Colombo": "LK",
  "Asia/Bangkok": "TH",
  "Asia/Jakarta": "ID",
  "Asia/Singapore": "SG",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Manila": "PH",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Hong_Kong": "HK",
  "Asia/Shanghai": "CN",
  "Asia/Taipei": "TW",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Perth": "AU",
  "Pacific/Auckland": "NZ",
  "Africa/Cairo": "EG",
  "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE",
  "Africa/Casablanca": "MA",
};

export function isPhoneCountry(code: string): code is CountryCode {
  return isSupportedCountry(code);
}

export function getStoredPhoneCountry(): CountryCode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && isPhoneCountry(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function storePhoneCountry(code: CountryCode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}

function regionFromLocaleTag(tag: string): CountryCode | null {
  try {
    const locale = new Intl.Locale(tag);
    const region = locale.maximize().region ?? locale.region;
    if (region && isPhoneCountry(region)) return region;
  } catch {
    /* ignore */
  }
  return null;
}

/** Detect country on first visit; prefers stored choice, then locale, then timezone. */
export function detectPhoneCountry(): CountryCode {
  const stored = getStoredPhoneCountry();
  if (stored) return stored;

  let detected: CountryCode = "US";

  if (typeof navigator !== "undefined") {
    for (const tag of navigator.languages ?? [navigator.language]) {
      const fromLang = regionFromLocaleTag(tag);
      if (fromLang) {
        detected = fromLang;
        storePhoneCountry(detected);
        return detected;
      }
    }
  }

  if (typeof Intl !== "undefined") {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const fromTz = TIMEZONE_COUNTRY[tz];
      if (fromTz) {
        detected = fromTz;
        storePhoneCountry(detected);
        return detected;
      }
    } catch {
      /* ignore */
    }
  }

  storePhoneCountry(detected);
  return detected;
}

export function isValidE164(value: string, country?: CountryCode): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (country) return isValidPhoneNumber(trimmed, country);
  return isValidPhoneNumber(trimmed);
}

export function parseE164ToParts(value: string): {
  country: CountryCode | null;
  national: string;
  e164: string;
} | null {
  const parsed = parsePhoneNumberFromString(value.trim());
  if (!parsed) return null;
  return {
    country: parsed.country ?? null,
    national: parsed.formatNational(),
    e164: parsed.format("E.164"),
  };
}
