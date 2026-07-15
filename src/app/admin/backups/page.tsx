import { requireSuperAdmin } from "@/lib/admin";
import { BackupsManager } from "@/components/admin/backups-manager";

export default async function AdminBackupsPage() {
  await requireSuperAdmin();
  return <BackupsManager />;
}
