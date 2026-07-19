import { OfficialManageBannerHost } from "@/components/platform/official-manage-banner-host";
import { auth } from "@/modules/auth";

/** Banner + return control while the Super Admin is managing @relune. */
export async function OfficialManageBannerGate() {
  const session = await auth();
  if (!session?.managingOfficial) return null;
  return <OfficialManageBannerHost />;
}
