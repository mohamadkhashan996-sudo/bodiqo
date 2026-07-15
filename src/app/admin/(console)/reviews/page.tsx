import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ReviewsManager } from "./reviews-manager";

export default async function AdminReviewsPage() {
  await requireAdmin();

  const reviews = await prisma.review.findMany({
    include: {
      product: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Reviews
        </h1>
        <p className="mt-2 text-sm text-[#f3efe6]/55">
          Approve or moderate product reviews.
        </p>
      </div>
      <ReviewsManager
        reviews={reviews.map((r) => ({
          id: r.id,
          author: r.author,
          rating: r.rating,
          title: r.title,
          body: r.body,
          approved: r.approved,
          createdAt: r.createdAt.toISOString(),
          productTitle: r.product.title,
          productSlug: r.product.slug,
        }))}
      />
    </div>
  );
}
