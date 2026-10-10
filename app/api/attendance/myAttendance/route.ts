import { prisma } from "@/lib/db";
import { expressError, handle, json } from "@/lib/api/express";
import { getCurrentUser } from "@/lib/auth/access";

/**
 * GET /api/attendance/myAttendance
 * Returns the formIds of all events the authenticated user has actually attended.
 */
export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return expressError(401, "Token is required");

    const records = await prisma.attendance.findMany({
      where: {
        userId: user.id,
        isPresent: true,
      },
      select: {
        formId: true,
      },
    });

    // Remove potential duplicates if a user somehow got scanned twice on different teams, etc.
    const formIds = [...new Set(records.map(r => r.formId))];

    return json({ success: true, formIds });
  });
}
