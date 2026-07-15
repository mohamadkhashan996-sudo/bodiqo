import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Categories" };

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  children: CategoryNode[];
};

function buildTree(
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    sortOrder: number;
  }>,
): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  for (const c of categories) {
    map.set(c.id, { ...c, children: [] });
  }
  const roots: CategoryNode[] = [];
  for (const c of categories) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

function CategoryList({ nodes, depth = 0 }: { nodes: CategoryNode[]; depth?: number }) {
  return (
    <ul className={depth > 0 ? "mt-2 space-y-2 border-s border-white/10 ps-4" : "space-y-3"}>
      {nodes.map((node) => (
        <li key={node.id}>
          <Link
            href={`/shop?category=${encodeURIComponent(node.name)}`}
            className="text-sm text-[#f3efe6] hover:text-[#4a8cff]"
          >
            {node.name}
          </Link>
          {node.description ? (
            <p className="text-xs text-[#f3efe6]/40">{node.description}</p>
          ) : null}
          {node.children.length > 0 ? (
            <CategoryList nodes={node.children} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default async function CategoriesPage() {
  let tree: CategoryNode[] = [];
  try {
    const categories = await prisma.category.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        sortOrder: true,
      },
    });
    tree = buildTree(categories);
  } catch {
    tree = [];
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pt-28 pb-24 md:px-8 md:pt-36">
      <p className="text-[11px] tracking-[0.24em] text-[#4a8cff] uppercase">
        Catalog
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[#f3efe6]">
        Categories
      </h1>
      <p className="mt-4 text-sm text-[#f3efe6]/55">
        Browse products by category.
      </p>

      {tree.length === 0 ? (
        <p className="mt-10 text-sm text-[#f3efe6]/55">
          No categories yet.{" "}
          <Link href="/shop" className="text-[#4a8cff]">
            View all products
          </Link>
        </p>
      ) : (
        <div className="mt-10 rounded-3xl border border-white/[0.08] bg-[#101010] p-6">
          <CategoryList nodes={tree} />
        </div>
      )}
    </div>
  );
}
