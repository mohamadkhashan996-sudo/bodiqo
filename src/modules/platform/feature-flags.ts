import { AppError } from "@/lib/errors";
import {
  DEFAULT_FEATURE_FLAGS,
  getFeatureFlags,
} from "@/modules/admin/services/payments";

export type FeatureFlag = keyof typeof DEFAULT_FEATURE_FLAGS;

/** Server-side kill switch for product surfaces controlled in Admin → Flags. */
export async function requireFeature(flag: FeatureFlag) {
  const flags = await getFeatureFlags();
  if (!flags[flag]) {
    throw new AppError(
      "This feature is temporarily unavailable.",
      403,
      "FEATURE_DISABLED",
    );
  }
}

export async function isFeatureEnabled(flag: FeatureFlag) {
  const flags = await getFeatureFlags();
  return Boolean(flags[flag]);
}
