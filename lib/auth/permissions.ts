import "server-only";

import type { SafeUser } from "@/lib/auth/access";
import { isAdmin } from "@/lib/auth/access";
import { isAttendanceScanner } from "@/lib/auth/attendance";
import { FORM_ANALYTICS_ROLES } from "@/lib/auth/roles";
import { envList, getEnv } from "@/lib/env";

/**
 * Who may do what, declared once.
 *
 * Role lists used to be written out inside the route that needed them, so
 * adding a role meant hunting down every endpoint that mentioned it. A
 * permission is named for the capability, not the screen, so the same set can
 * back several routes.
 *
 * ADMIN is not listed in each set — `can()` grants it everything, matching the
 * Express `checkAccess`, where ADMIN always passed.
 */
export const PERMISSIONS = {
  /** Read a form's registration analytics (EventStats). */
  FORM_ANALYTICS_VIEW: new Set<string>(FORM_ANALYTICS_ROLES),
} satisfies Record<string, ReadonlySet<string>>;

export type Permission = keyof typeof PERMISSIONS;

/**
 * `user.access` is this project's role field — the Express `user.role` in the
 * review comment does not exist on this schema.
 */
export function can(
  user: Pick<SafeUser, "access"> | null | undefined,
  permission: Permission,
): boolean {
  if (!user) return false;
  if (user.access === "ADMIN") return true;
  return PERMISSIONS[permission].has(user.access);
}

/**
 * The whole of the Express analytics rule, in one place:
 *
 *   if (!allowedUsers.includes(req.user.access) && req.user.email != "srex@…")
 *
 * The address list moved to `FORM_ANALYTICS_ALLOWED_EMAILS` in the environment.
 *
 * Both the API route and the page that renders EventStats call this, so the
 * page can no longer refuse someone the endpoint would have served — which is
 * exactly what happened when the page checked `isAdmin` on its own.
 */
export function canViewFormAnalytics(
  user: Pick<SafeUser, "access" | "email"> | null | undefined,
): boolean {
  if (!user) return false;
  if (can(user, "FORM_ANALYTICS_VIEW")) return true;

  const allowed = envList(getEnv().FORM_ANALYTICS_ALLOWED_EMAILS).map((entry) =>
    entry.toLowerCase(),
  );
  return allowed.includes(user.email.toLowerCase());
}

/**
 * Who may open the attendance scanner and call its APIs.
 *
 * ADMIN plus the dedicated door-duty account. Both the page and every
 * attendance endpoint use this so the sidebar cannot promise access the
 * server will refuse.
 */
export function canMarkAttendance(
  user: Pick<SafeUser, "access" | "email"> | null | undefined,
): boolean {
  if (!user) return false;
  return isAdmin(user) || isAttendanceScanner(user);
}
