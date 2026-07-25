import QRCode from "qrcode";

import { site } from "@/config/site";
import { fail, guardApiAbuse, ok, optionalUser } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { assertCanInteractWithPost } from "@/modules/users/services/visibility";

/** QR for the canonical post deep link (visibility-gated). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await guardApiAbuse(request, "posts:id:share:qr:get", 30);
    const viewer = await optionalUser();
    const postId = (await params).id;
    await assertCanInteractWithPost(viewer?.id, postId, {
      requireAuth: false,
    });

    const url = new URL(request.url);
    const size = Math.min(
      512,
      Math.max(128, Number(url.searchParams.get("size") ?? 280)),
    );
    const link = `${site.url.replace(/\/$/, "")}/post/${postId}?utm_source=qr&utm_medium=share&utm_campaign=post_share`;
    const dataUrl = await QRCode.toDataURL(link, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
    });
    if (!dataUrl) throw new AppError("Could not generate QR", 500);
    return ok({ dataUrl, url: link });
  } catch (e) {
    return fail(e);
  }
}
