import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import {
  claimStarterCoins,
  getOrCreateWallet,
  listGiftCatalog,
} from "@/modules/live/services/sessions";

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "live:gifts:get", 60);
    const user = await requireUser();
    const [gifts, wallet] = await Promise.all([
      listGiftCatalog(),
      getOrCreateWallet(user.id),
    ]);
    return ok({ gifts, coins: wallet.coins });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "live:wallet:claim", 5);
    const user = await requireUser();
    const wallet = await claimStarterCoins(user.id);
    return ok({ coins: wallet.coins });
  } catch (e) {
    return fail(e);
  }
}
