import type { MetadataRoute } from "next";

import { getAllPublicEvents } from "@/lib/services/events";
import { SITE_URL } from "@/lib/seo/metadata";

/**
 * Dynamic sitemap.
 *
 * The Vite app shipped no sitemap at all, and because every route was rendered
 * client-side there was nothing for a crawler to discover beyond the root URL.
 * Event pages are enumerated here so each one can be indexed on its own.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // `satisfies` keeps `changeFrequency` narrowed to its literal type, which a
  // plain `.map()` over an untyped array would widen to `string`.
  const staticRoutes = (
    [
      { path: "/", changeFrequency: "weekly", priority: 1 },
      { path: "/events", changeFrequency: "daily", priority: 0.9 },
      { path: "/events/past", changeFrequency: "monthly", priority: 0.6 },
      { path: "/team", changeFrequency: "monthly", priority: 0.8 },
      { path: "/alumni", changeFrequency: "monthly", priority: 0.5 },
      { path: "/Insights", changeFrequency: "weekly", priority: 0.7 },
      { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.2 },
      {
        path: "/terms-and-conditions",
        changeFrequency: "yearly",
        priority: 0.2,
      },
    ] satisfies Array<{
      path: string;
      changeFrequency: NonNullable<
        MetadataRoute.Sitemap[number]["changeFrequency"]
      >;
      priority: number;
    }>
  ).map((entry) => ({
    url: `${SITE_URL}${entry.path === "/" ? "/" : entry.path}`,
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));

  // A database hiccup must not fail the whole sitemap — better to serve the
  // static routes than a 500.
  let eventRoutes: MetadataRoute.Sitemap = [];
  try {
    const events = await getAllPublicEvents();
    eventRoutes = events.map((event) => ({
      url: `${SITE_URL}/events/${event.id}`,
      lastModified: now,
      changeFrequency: event.isPast ? "yearly" : "weekly",
      priority: event.isPast ? 0.4 : 0.8,
    }));
  } catch (error) {
    console.error("[sitemap] could not load events", error);
  }

  return [...staticRoutes, ...eventRoutes];
}
