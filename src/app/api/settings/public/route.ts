import { NextResponse } from "next/server";

import { fail, guardApiAbuse } from "@/lib/api";
import { getSetting } from "@/modules/admin/services/settings";

/** Non-sensitive limits for client-side upload UX. */
export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "settings:public", 60);
    const [mediaLimits, videoLimits, storage] = await Promise.all([
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
          allowShorts: videoLimits?.allowShorts !== false,
          maxDurationSec: videoLimits?.maxDurationSec ?? 600,
        },
        storage: {
          maxUploadMb: storage?.maxUploadMb ?? 50,
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
