import { z } from "zod";

import { body, fail, guardApiAbuse, ok } from "@/lib/api";
import { captureException } from "@/lib/error-tracking";

const schema = z.object({
  message: z.string().min(1).max(2000),
  name: z.string().max(200).optional(),
  stack: z.string().max(8000).optional(),
  path: z.string().max(500).optional(),
  digest: z.string().max(200).optional(),
});

/** Client / browser error ingest → structured logs + optional Sentry. */
export async function POST(request: Request) {
  try {
    await guardApiAbuse(request, "errors:client", 30, 60_000);
    const data = await body(request, schema);
    await captureException(
      Object.assign(new Error(data.message), {
        name: data.name || "ClientError",
        stack: data.stack,
      }),
      {
        source: "client",
        path: data.path,
        requestId: request.headers.get("x-request-id") || undefined,
        extra: { digest: data.digest },
      },
    );
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
