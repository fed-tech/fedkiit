import { exportAttendance } from "@/lib/services/attendance";
import { expressError, handle } from "@/lib/api/express";
import { getCurrentUser } from "@/lib/auth/access";
import { canMarkAttendance } from "@/lib/auth/permissions";

/**
 * GET /api/form/export-attendance/:id
 * Port of controllers/registration/exportAttendance.
 *
 * Admin and door-duty scanner, matching the route's `checkAccess("ADMIN")` plus
 * the dedicated attendance account. This previously accepted any club member, which handed the full attendee list of any event to
 * every executive rather than to admins alone.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/form/export-attendance/[id]">,
) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return expressError(401, "Token is required");
    if (!canMarkAttendance(user)) return expressError(403, "Unauthorized");

    const { id } = await ctx.params;
    const { filename, csv } = await exportAttendance(id);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    }) as never;
  });
}
