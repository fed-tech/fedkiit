// Route entry — renders the component ported from
// FED-Frontend/src/sections/Profile/General/ProfileView/ProfileView.jsx

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/access";
import { isAttendanceScanner } from "@/lib/auth/attendance";
import ProfileView from "@/src/sections/Profile/General/ProfileView/ProfileView";

export default async function Page() {
  const user = await getCurrentUser();
  if (user && isAttendanceScanner(user)) redirect("/profile/attendance");

  return <ProfileView />;
}
