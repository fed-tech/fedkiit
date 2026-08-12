import { prisma } from "@/lib/db";
import { handleRoute, ok, fail, readJson } from "@/lib/api/respond";
import { deriveEmbedUrl } from "@/lib/utils/embedUrl";
import { getCurrentUser, isAdmin } from "@/lib/auth/access";
import type { Platform, CreateSocialPostInput } from "@/lib/types/SocialPost";

const VALID_PLATFORMS: Platform[] = ["instagram", "linkedin"];

/**
 * Mutating routes are ADMIN-only, decided from the signed-in session like
 * every other admin route here.
 *
 * This replaced an `x-admin-secret` header checked against a shared password.
 * That was a reasonable stopgap for a contributor without an admin account,
 * but it authenticated nobody in particular: one password for everyone, no
 * record of who changed a post, and the browser had to hold the secret to send
 * it. The session cookie is httpOnly and already identifies the person.
 */
async function requireAdmin(): Promise<ReturnType<typeof fail> | null> {
  const user = await getCurrentUser();
  if (!user) return fail(401, "You must be signed in to do that");
  if (!isAdmin(user)) return fail(403, "You do not have permission to do that");
  return null;
}

/**
 * GET /api/social-posts
 *
 * `?visible=true` returns the published posts and is open to anyone. The
 * unfiltered list also contains posts an admin has deliberately hidden, so it
 * is ADMIN-only — otherwise unpublishing a post would still leave it readable
 * to anyone who removed the query string.
 *
 * The public /Insights page does not use this route at all; SocialFeed reads
 * Prisma directly as a server component.
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const { searchParams } = new URL(request.url);
    const visibleOnly = searchParams.get("visible") === "true";

    if (!visibleOnly) {
      const denied = await requireAdmin();
      if (denied) return denied;
    }

    const where = visibleOnly ? { isVisible: true } : {};

    const posts = await prisma.socialPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return ok(posts, "Social posts fetched successfully");
  });
}

/**
 * POST /api/social-posts
 * Create a new social post. ADMIN only.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const denied = await requireAdmin();
    if (denied) return denied;

    const body = await readJson<CreateSocialPostInput>(request);

    if (!body.platform || !VALID_PLATFORMS.includes(body.platform)) {
      return fail(422, "Platform must be 'instagram' or 'linkedin'");
    }
    if (!body.url || typeof body.url !== "string") {
      return fail(422, "A valid URL is required");
    }

    const embedUrl = deriveEmbedUrl(body.platform, body.url);
    if (!embedUrl) {
      return fail(
        422,
        `Could not derive embed URL for platform "${body.platform}". Check the URL format.`,
      );
    }

    const post = await prisma.socialPost.create({
      data: {
        platform: body.platform,
        url: body.url.trim(),
        embedUrl,
        caption: body.caption?.trim() || null,
        isVisible: body.isVisible ?? true,
      },
    });

    return ok(post, "Social post created successfully");
  });
}
