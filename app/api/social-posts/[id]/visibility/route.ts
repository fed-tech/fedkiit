import { prisma } from "@/lib/db";
import { handleRoute, ok, fail, readJson } from "@/lib/api/respond";

import { getCurrentUser, isAdmin } from "@/lib/auth/access";

/** ADMIN-only, from the signed-in session. See app/api/social-posts/route.ts. */
async function requireAdmin(): Promise<ReturnType<typeof fail> | null> {
  const user = await getCurrentUser();
  if (!user) return fail(401, "You must be signed in to do that");
  if (!isAdmin(user)) return fail(403, "You do not have permission to do that");
  return null;
}

/**
 * PATCH /api/social-posts/[id]/visibility
 * Toggle the visibility of a social post. ADMIN only.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/social-posts/[id]/visibility">,
) {
  return handleRoute(async () => {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id } = await ctx.params;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return fail(404, "Social post not found");
    }

    const existing = await prisma.socialPost.findUnique({ where: { id } });
    if (!existing) return fail(404, "Social post not found");

    const body = await readJson<{ isVisible: boolean }>(request);
    if (typeof body.isVisible !== "boolean") {
      return fail(422, "isVisible must be a boolean");
    }

    const updated = await prisma.socialPost.update({
      where: { id },
      data: { isVisible: body.isVisible },
    });

    return ok(updated, "Social post visibility updated successfully");
  });
}
