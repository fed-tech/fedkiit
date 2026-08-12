import { prisma } from "@/lib/db";
import { handleRoute, ok, fail, readJson } from "@/lib/api/respond";
import { deriveEmbedUrl } from "@/lib/utils/embedUrl";
import type { Platform, UpdateSocialPostInput } from "@/lib/types/SocialPost";

const VALID_PLATFORMS: Platform[] = ["instagram", "linkedin"];

import { getCurrentUser, isAdmin } from "@/lib/auth/access";

/** ADMIN-only, from the signed-in session. See app/api/social-posts/route.ts. */
async function requireAdmin(): Promise<ReturnType<typeof fail> | null> {
  const user = await getCurrentUser();
  if (!user) return fail(401, "You must be signed in to do that");
  if (!isAdmin(user)) return fail(403, "You do not have permission to do that");
  return null;
}

/**
 * PUT /api/social-posts/[id]
 * Update an existing social post. ADMIN only.
 */
export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/social-posts/[id]">,
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

    const body = await readJson<UpdateSocialPostInput>(request);

    const platform = body.platform ?? (existing.platform as Platform);
    const url = body.url ?? existing.url;

    if (body.platform && !VALID_PLATFORMS.includes(body.platform)) {
      return fail(422, "Platform must be 'instagram' or 'linkedin'");
    }

    // Re-derive embed URL if platform or URL changed
    let embedUrl = existing.embedUrl;
    if (body.platform || body.url) {
      const derived = deriveEmbedUrl(platform, url);
      if (!derived) {
        return fail(
          422,
          `Could not derive embed URL for platform "${platform}". Check the URL format.`,
        );
      }
      embedUrl = derived;
    }

    const updated = await prisma.socialPost.update({
      where: { id },
      data: {
        platform,
        url: url.trim(),
        embedUrl,
        caption:
          body.caption !== undefined ? body.caption?.trim() || null : undefined,
        isVisible: body.isVisible,
      },
    });

    return ok(updated, "Social post updated successfully");
  });
}

/**
 * DELETE /api/social-posts/[id]
 * Delete a social post. ADMIN only.
 */
export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/social-posts/[id]">,
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

    await prisma.socialPost.delete({ where: { id } });

    return ok(null, "Social post deleted successfully");
  });
}
