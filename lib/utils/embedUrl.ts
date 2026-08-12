import type { Platform } from "@/lib/types/SocialPost";

/**
 * Derives an iframe-embeddable URL from a regular Instagram or LinkedIn post URL.
 *
 * Instagram: appends `/embed` to the post/reel URL.
 * LinkedIn:  rewrites share URLs into the embed-post format.
 *
 * Returns `null` if the URL doesn't match a known pattern for the given platform.
 */
export function deriveEmbedUrl(
  platform: Platform,
  rawUrl: string,
): string | null {
  try {
    const url = new URL(rawUrl.trim());

    switch (platform) {
      case "instagram": {
        // Accept instagram.com/p/..., /reel/..., /tv/... URLs
        if (
          url.hostname !== "www.instagram.com" &&
          url.hostname !== "instagram.com"
        ) {
          return null;
        }
        const match = url.pathname.match(
          /^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/,
        );
        if (!match) return null;

        // Build a clean embed URL
        return `https://www.instagram.com/${match[1]}/${match[2]}/embed`;
      }

      case "linkedin": {
        // Accept linkedin.com/posts/..., /feed/update/..., /embed/feed/update/...
        if (
          url.hostname !== "www.linkedin.com" &&
          url.hostname !== "linkedin.com"
        ) {
          return null;
        }

        // Already an embed URL?
        if (url.pathname.startsWith("/embed/feed/update/")) {
          return rawUrl.trim();
        }

        // /feed/update/urn:li:activity:1234... → embed
        const feedMatch = url.pathname.match(
          /\/feed\/update\/(urn:li:(?:activity|ugcPost):\d+)/,
        );
        if (feedMatch) {
          return `https://www.linkedin.com/embed/feed/update/${feedMatch[1]}`;
        }

        // /posts/username_activity-1234...
        const postsMatch = url.pathname.match(
          /\/posts\/[^/]+-activity-(\d+)/,
        );
        if (postsMatch) {
          return `https://www.linkedin.com/embed/feed/update/urn:li:activity:${postsMatch[1]}`;
        }

        return null;
      }

      default:
        return null;
    }
  } catch {
    // Malformed URL
    return null;
  }
}
