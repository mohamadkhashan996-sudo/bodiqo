"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const sections = [
  {
    title: "Commerce",
    items: [
      { href: "/admin", label: "Overview" },
      { href: "/admin/products", label: "Products" },
      { href: "/admin/categories", label: "Categories" },
      { href: "/admin/orders", label: "Orders" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/coupons", label: "Coupons" },
      { href: "/admin/reviews", label: "Reviews" },
    ],
  },
  {
    title: "Dropshipping",
    items: [
      { href: "/admin/dropship", label: "Dropship hub" },
      { href: "/admin/dropship/orders", label: "Supplier orders" },
      { href: "/admin/suppliers", label: "Suppliers" },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/banners", label: "Banners" },
      { href: "/admin/pages", label: "Pages" },
      { href: "/admin/blog", label: "Blog" },
      { href: "/admin/menus", label: "Menus" },
      { href: "/admin/media", label: "Media" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/dropship", label: "Import products" },
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/seo", label: "SEO" },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6 px-3 py-5">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-2 text-[10px] tracking-[0.2em] text-[#f3efe6]/35 uppercase">
            {section.title}
          </p>
          <ul className="mt-2 space-y-0.5">
            {section.items.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm transition",
                      active
                        ? "bg-white/8 text-[#d4b483]"
                        : "text-[#f3efe6]/70 hover:bg-white/5 hover:text-[#f3efe6]",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
