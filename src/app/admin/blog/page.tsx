import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminBlogPage() {
  await requireAdmin();
  let count = 0;
  try {
    // lightweight presence check depending on model availability
    count = await prisma.blogPost.count();
  } catch {
    count = 0;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Blog</h1>
      <p className="text-sm text-[#f3efe6]/55">
        Publish journal posts and SEO content.
      </p>
      <div className="rounded-2xl border border-white/10 bg-[#121212] p-6 text-sm text-[#f3efe6]/70">
        <p>{count} records in database.</p>
        <p className="mt-3 text-[#f3efe6]/45">
          Use Settings, Products, Orders, Import, and Media for day-to-day store
          operations. Extended blog editing continues to expand on this
          foundation.
        </p>
      </div>
    </div>
  );
}
