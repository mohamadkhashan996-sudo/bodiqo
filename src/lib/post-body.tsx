import Link from "next/link";
import type { ReactNode } from "react";

import { POST_BODY_TOKEN } from "@/lib/post-text";

/** Turn @handles and #hashtags in post body into links. */
export function linkifyPostBody(body: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(POST_BODY_TOKEN.source, POST_BODY_TOKEN.flags);
  while ((match = re.exec(body)) !== null) {
    if (match.index > last) {
      nodes.push(body.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("@")) {
      const handle = token.slice(1).toLowerCase();
      nodes.push(
        <Link
          key={`${match.index}-${token}`}
          href={`/u/${handle}`}
          className="font-semibold text-[var(--signal-deep)] hover:underline"
        >
          {token}
        </Link>,
      );
    } else {
      const tag = token.slice(1).toLowerCase();
      nodes.push(
        <Link
          key={`${match.index}-${token}`}
          href={`/hashtag/${encodeURIComponent(tag)}`}
          className="font-semibold text-[var(--signal-deep)] hover:underline"
        >
          {token}
        </Link>,
      );
    }
    last = match.index + token.length;
  }
  if (last < body.length) nodes.push(body.slice(last));
  return nodes.length ? nodes : [body];
}
