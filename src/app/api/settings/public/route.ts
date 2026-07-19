import { NextResponse } from "next/server";

import { fail, guardApiAbuse } from "@/lib/api";
import { getFeatureFlags } from "@/modules/admin/services/payments";
import { getSetting } from "@/modules/admin/services/settings";

/** Non-sensitive limits and flags for client-side UX. */
export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "settings:public", 60);
    const [mediaLimits, videoLimits, storage, flags, websiteName, tagline, logoUrl] =
      await Promise.all([
        getSetting<{
          imageMaxMb?: number;
          videoMaxMb?: number;
          voiceMaxMb?: number;
          documentMaxMb?: number;
        }>("mediaLimits"),
        getSetting<{ allowShorts?: boolean; maxDurationSec?: number }>(
          "videoLimits",
        ),
        getSetting<{ maxUploadMb?: number }>("storage"),
        getFeatureFlags(),
        getSetting<string>("websiteName"),
        getSetting<string>("tagline"),
        getSetting<string>("logoUrl"),
      ]);

    return NextResponse.json(
      {
        mediaLimits: {
          imageMaxMb: mediaLimits?.imageMaxMb ?? 10,
          videoMaxMb: mediaLimits?.videoMaxMb ?? 200,
          voiceMaxMb: mediaLimits?.voiceMaxMb ?? 20,
          documentMaxMb: mediaLimits?.documentMaxMb ?? 25,
        },
        videoLimits: {
          allowShorts: videoLimits?.allowShorts !== false && flags.shorts,
          maxDurationSec: videoLimits?.maxDurationSec ?? 600,
        },
        storage: {
          maxUploadMb: storage?.maxUploadMb ?? 50,
        },
        branding: {
          websiteName: websiteName || "Relune",
          tagline: tagline || "Presence, beautifully shared.",
          logoUrl: logoUrl || "/brand/mark.png",
        },
        features: {
          shorts: flags.shorts,
          live: flags.live,
          stories: flags.stories,
          communities: flags.communities,
          messaging: flags.messaging,
          calls: flags.calls,
          gifts: flags.gifts,
          creatorStudio: flags.creatorStudio,
          exploreRecommendations: flags.exploreRecommendations,
          registration: flags.registration,
          pushNotifications: flags.pushNotifications,
        },
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300, max-age=30",
        },
      },
    );
  } catch (error) {
    return fail(error);
  }
}
