import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireStaff } from "@/lib/api";
import {
  adjustWalletCoins,
  listPaymentsOverview,
  setGiftCatalogActive,
} from "@/modules/admin/services/payments";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "admin:payments");
    await requireStaff("payments:read");
    return ok(await listPaymentsOverview());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "admin:payments:write", 30);
    const staff = await requireStaff("payments:write");
    const data = await body(
      request,
      z.discriminatedUnion("action", [
        z.object({
          action: z.literal("adjust_wallet"),
          userId: z.string().min(1),
          delta: z.number().int(),
          reason: z.string().min(3).max(300),
        }),
        z.object({
          action: z.literal("catalog_active"),
          giftId: z.string().min(1),
          active: z.boolean(),
        }),
      ]),
    );

    if (data.action === "adjust_wallet") {
      return ok(
        await adjustWalletCoins(
          staff.id,
          data.userId,
          data.delta,
          data.reason,
        ),
      );
    }
    return ok(
      await setGiftCatalogActive(staff.id, data.giftId, data.active),
    );
  } catch (e) {
    return fail(e);
  }
}
