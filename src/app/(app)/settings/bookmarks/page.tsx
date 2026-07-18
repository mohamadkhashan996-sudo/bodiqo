import { redirect } from "next/navigation";

/** Bookmarks live on the first-class Saved page. */
export default function BookmarksRedirectPage() {
  redirect("/saved");
}
