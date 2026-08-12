// Social post management, inside the admin panel.
//
// Gated on the server, like /profile/attendance: `proxy.ts` only checks for a
// valid session, not a role, so without this any signed-in participant who
// typed the path would get the management UI. The API refuses them, but a
// screen full of controls that all fail is worse than not showing it.

import { redirect } from "next/navigation";

import { getCurrentUser, isAdmin } from "@/lib/auth/access";
import SocialManagementAdminPage from "@/components/SocialManagementAdmin";

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) redirect("/Login?next=/profile/social");
  if (!isAdmin(user)) redirect("/profile");

  return <SocialManagementAdminPage />;
}
