import { requireSuperAdmin } from "@/lib/admin";
import { LocalizationManager } from "@/components/admin/localization-manager";

export default async function AdminLocalizationPage() {
  await requireSuperAdmin();
  return <LocalizationManager />;
}
