import { getAttendanceStats } from "@/lib/services/attendance";
import { expressError, handle, json } from "@/lib/api/express";
import { getCurrentUser, isAdmin } from "@/lib/auth/access";

/**
 * GET /api/form/attendance-stats/:id
 *
 * Live present / registered counts while scanning at the door.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/form/attendance-stats/[id]">,
) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return expressError(401, "Token is required");
    if (!isAdmin(user)) return expressError(403, "Unauthorized");

    const { id } = await ctx.params;
    const stats = await getAttendanceStats(id);

    return json({ success: true, ...stats });
  });
}
