import { OpenOfficialAccountButton } from "@/components/admin/open-official-button";
import { auth } from "@/modules/auth";

import { AdminOverviewClient } from "./overview-client";

export default async function AdminOverviewPage() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  return (
    <div>
      {isSuperAdmin ? (
        <div className="mb-4 flex justify-end">
          <OpenOfficialAccountButton />
        </div>
      ) : null}
      <AdminOverviewClient />
    </div>
  );
}
