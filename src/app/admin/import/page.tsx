import { redirect } from "next/navigation";

/** Legacy Shopify import route — dropshipping hub replaces it. */
export default function ImportRedirectPage() {
  redirect("/admin/dropship");
}
