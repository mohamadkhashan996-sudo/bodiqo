import { redirect } from "next/navigation";

/** Legacy URL — setup is admin-only. */
export default function SetupRedirectPage() {
  redirect("/admin/setup");
}
