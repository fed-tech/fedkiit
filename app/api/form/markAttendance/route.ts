import { markAttendance } from "@/lib/services/attendance";
import { body, expressError, handle, json } from "@/lib/api/express";
import { getCurrentUser } from "@/lib/auth/access";
import { canMarkAttendance } from "@/lib/auth/permissions";

/**
 * POST /api/form/markAttendance
 * Port of controllers/registration/markAttendance.js.
 *
 * Restricted to the roles the Express author listed in the `checkAccess` they
 * left commented out, plus any address in FORM_ATTENDANCE_ALLOWED_EMAILS. This
 * deliberately diverges from the Express route as shipped, which has that check
 * commented out entirely and so accepts unauthenticated calls.
 *
 * The QR token alone is not an access control: a participant can mint their own
 * through /api/form/attendanceCode — that endpoint exists so they can display
 * their code — and could then post it straight back here to mark themselves
 * present. Restricting who may *scan* is what closes that, and it has to live
 * here rather than only on the page, because the page is just a UI over this
 * call.
 *
 * Issuing a code stays open to any signed-in user; only redeeming one is
 * restricted.
 *
 * Responds `{ message, attendance }` at the top level, which is the shape
 * AttendancePage reads.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return expressError(401, "Token is required");
    if (!canMarkAttendance(user)) return expressError(403, "Unauthorized");

    const b = await body<{ formId?: string; token?: string }>(request);
    const result = await markAttendance({ formId: b.formId, token: b.token });

    return json(result);
  });
}
