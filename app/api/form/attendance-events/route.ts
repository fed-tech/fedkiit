import {
  getAttendanceStats,
  listAttendanceEvents,
} from "@/lib/services/attendance";
import { expressError, handle, json } from "@/lib/api/express";
import { getCurrentUser, isAdmin } from "@/lib/auth/access";

/**
 * GET /api/form/attendance-events
 *
 * Lightweight event list for the attendance scanner — id + info only, no
 * sections JSON. Avoids loading every form's full payload on door duty.
 */
export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return expressError(401, "Token is required");
    if (!isAdmin(user)) return expressError(403, "Unauthorized");

    const events = await listAttendanceEvents();
    return json({
      success: true,
      message: "Events fetched successfully",
      events,
    });
  });
}
