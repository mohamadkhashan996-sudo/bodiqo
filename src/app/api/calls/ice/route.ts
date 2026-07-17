import { fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { defaultIceServers } from "@/lib/call-media";
import { issueTurnCredentials } from "@/lib/secret-box";

function parseTurnUrls(raw: string | undefined) {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  try {
    await guardApiAbuse(request, "calls:ice", 60);
    const user = await requireUser();
    const iceServers = [...defaultIceServers()];
    const urls = parseTurnUrls(process.env.TURN_URLS);
    if (urls.length) {
      const issued = issueTurnCredentials(user.id, 3600);
      if (issued) {
        iceServers.push({
          urls,
          username: issued.username,
          credential: issued.credential,
        });
      } else {
        // Static username without shared secret is allowed only for open TURN relays.
        iceServers.push({ urls });
      }
    }
    return ok({ iceServers, hd: true });
  } catch (error) {
    return fail(error);
  }
}
