import { requireAdmin } from "@/lib/admin";
import { ActivityLogViewer } from "@/components/admin/activity-log-viewer";

export default async function AdminActivityPage() {
  await requireAdmin();
  return <ActivityLogViewer />;
}
