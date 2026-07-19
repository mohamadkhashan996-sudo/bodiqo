import { AccountReluneHost } from "@/components/platform/account-relune-fab";
import { auth } from "@/modules/auth";

/**
 * Renders the floating Account Relune control only for the platform owner.
 * Hidden from every other role (including other admins/moderators).
 */
export async function AccountReluneGate() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") return null;
  if (session.managingOfficial) return null;
  return <AccountReluneHost />;
}
