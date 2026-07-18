/** Shared cursor pagination helpers for Prisma `take + 1` queries. */

export function pageSize(limit: number, max = 50, min = 1) {
  return Math.min(Math.max(limit, min), max);
}

/** Consume an over-fetched page (`take + 1`) into items + nextCursor. */
export function splitCursorPage<T extends { id: string }>(
  rows: T[],
  take: number,
): { items: T[]; nextCursor: string | null } {
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return {
    items,
    nextCursor: hasMore ? rows[take]!.id : null,
  };
}
