import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Hostnames that may access the Next.js **dev** server when it was started on
 * localhost but opened via a LAN IP, ngrok, or Cloudflare quick tunnel.
 *
 * Without this, Next blocks `/_next/*` and HMR for non-localhost hosts — the
 * HTML loads but client JS and API-driven flows (login, forms) silently fail.
 *
 * Reads `TRUSTED_ORIGIN_HOSTS` from `.env.local` / `.env` so one list drives
 * both this and server-side origin checks.
 */
export function devAllowedOrigins(): string[] {
  const origins = new Set<string>([
    "localhost",
    "127.0.0.1",
    // Wildcards supported by Next 16 — covers changing tunnel subdomains.
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.trycloudflare.com",
  ]);

  for (const file of [".env.local", ".env"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;

    const text = readFileSync(path, "utf8");
    const match = text.match(/^TRUSTED_ORIGIN_HOSTS=(.+)$/m);
    if (!match?.[1]) continue;

    for (const part of match[1].split(",")) {
      const entry = part.trim();
      if (!entry) continue;
      try {
        const host = entry.includes("://")
          ? new URL(entry).hostname
          : entry.split(":")[0];
        if (host) origins.add(host);
      } catch {
        origins.add(entry.split(":")[0]!);
      }
    }
  }

  return [...origins];
}
