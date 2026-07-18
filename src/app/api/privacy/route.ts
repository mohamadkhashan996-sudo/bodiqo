import { PrivacyAudience } from "@prisma/client";
import { z } from "zod";

import { body, fail, guardApiAbuse, ok, requireUser } from "@/lib/api";
import { getPrivacy, updatePrivacy } from "@/modules/users/services/privacy";

const schema = z.object({
  whoCanFollow: z.nativeEnum(PrivacyAudience).optional(),
  whoCanMessage: z.nativeEnum(PrivacyAudience).optional(),
  whoCanCall: z.nativeEnum(PrivacyAudience).optional(),
  whoCanComment: z.nativeEnum(PrivacyAudience).optional(),
  whoCanMention: z.nativeEnum(PrivacyAudience).optional(),
  whoCanTag: z.nativeEnum(PrivacyAudience).optional(),
  whoCanSeeStories: z.nativeEnum(PrivacyAudience).optional(),
  whoCanSeeActivity: z.nativeEnum(PrivacyAudience).optional(),
  whoCanSeeOnline: z.nativeEnum(PrivacyAudience).optional(),
  showReadReceipts: z.boolean().optional(),
  showTyping: z.boolean().optional(),
});
export async function GET() {
  try {
    return ok({ privacy: await getPrivacy((await requireUser()).id) });
  } catch (error) {
    return fail(error);
  }
}
export async function PATCH(request: Request) {
  try {
    await guardApiAbuse(request, "privacy:patch");
    const user = await requireUser();
    return ok({
      privacy: await updatePrivacy(user.id, await body(request, schema)),
    });
  } catch (error) {
    return fail(error);
  }
}
