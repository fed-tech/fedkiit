// Route entry — renders the component ported from
// FED-Frontend/src/pages/AttendancePage/AttendancePage.jsx
//
// Gated on the server. The sidebar only ever *showed* this link to admins, but
// that is presentation: `proxy.ts` guards /profile by checking for a valid
// session, not a role, so before this check any signed-in participant who typed
// the path got a working scanner. Combined with the fact that a participant can
// generate their own QR (that is the whole point of QRCodeModal), it meant
// anyone could mark themselves present.
//
// The gate was `isAdmin` at first, which closed that hole but also locked out
// attendance@fedkiit.com — a plain USER whose only purpose is scanning at the
// door. `canMarkAttendance` admits the senior-executive roles the Express
// author intended, plus any address in FORM_ATTENDANCE_ALLOWED_EMAILS, without
// handing a shared login the event editing that comes with ADMIN.
//
// The QR-issuing endpoint stays open to any signed-in user — participants must
// be able to produce their own code. Only scanning is restricted.

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/access";
import { canMarkAttendance } from "@/lib/auth/permissions";
import AttendancePage from "@/src/views/AttendancePage/AttendancePage";

export default async function Page() {
  const user = await getCurrentUser();

  // Matches what proxy.ts does for an anonymous request to a protected route,
  // so an expired session lands on the login page rather than a bare redirect.
  if (!user) redirect("/Login?next=/profile/attendance");
  if (!canMarkAttendance(user)) redirect("/profile");

  return <AttendancePage />;
}
