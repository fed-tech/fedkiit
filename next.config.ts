import type { NextConfig } from "next";

import { devAllowedOrigins } from "./lib/dev-origins";

const nextConfig: NextConfig = {
  // Dev-only: allow LAN IP, ngrok, and Cloudflare tunnel hosts to load /_next/*
  // bundles and HMR. Without this, opening http://10.x.x.x:5000 or a tunnel URL
  // serves HTML but blocks client JS — login and all client API calls break.
  allowedDevOrigins: devAllowedOrigins(),
  // Inject the shared SCSS variables into every stylesheet. The original
  // modules each did `@import ".../Global.scss"`, and two used Vite's absolute
  // "/src/..." form which Next cannot resolve. Injecting once is equivalent and
  // keeps every module compiling.
  sassOptions: {
    // Each module carries its own relative `@use` of Global.scss (as the
    // originals did). Injecting it globally is not workable here: Turbopack's
    // Sass loader resolves a bare specifier relative to the importing file and
    // rejects a drive-lettered absolute path.
    //
    // The ported stylesheets use the older @import syntax throughout; silence
    // the Dart Sass 3 notice rather than rewriting 84 files.
    silenceDeprecations: ["import", "legacy-js-api", "global-builtin"],
  },

  // Every remote host the migrated content actually references. `images.domains`
  // is deprecated in Next 16, so these are all `remotePatterns`.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "cdn.prod.website-files.com" },
      { protocol: "https", hostname: "uploads-ssl.webflow.com" },
      { protocol: "https", hostname: "assets-global.website-files.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "encrypted-tbn0.gstatic.com" },
      { protocol: "https", hostname: "png.pngtree.com" },
      { protocol: "https", hostname: "miro.medium.com" },
      { protocol: "https", hostname: "cdn-images-1.medium.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Cloudinary and Prisma pull in optional native deps that must not be bundled.
  serverExternalPackages: ["@prisma/client", "bcryptjs", "cloudinary"],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Permanent redirect for printed QR code that points to the old event.
      // The QR is already in circulation so we redirect server-side (308) so
      // every scanner, browser and search engine follows it automatically.
      {
        source: "/Events/6a74c22b4a467d7a0aac0cc6",
        destination: "/Events/6a7797c26a9a4d018da54ba1",
        permanent: true,
      },
    ];
  },

  // Note: legacy capitalised URLs (/Events, /Team, /SignUp …) are *not*
  // redirected here. Next matches a redirect `source` case-insensitively, so a
  // rule from "/Events" to "/events" also matches "/events" and loops
  // permanently. Those redirects live in `proxy.ts`, which can compare the
  // pathname case-sensitively.
};

export default nextConfig;
