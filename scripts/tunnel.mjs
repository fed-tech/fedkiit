#!/usr/bin/env node
/**
 * Starts a Cloudflare quick tunnel to the local Next.js dev server.
 *
 * Usage:
 *   node scripts/tunnel.mjs
 *   node scripts/tunnel.mjs --port 5000
 *
 * After the tunnel URL appears, set in `.env.local`:
 *   NEXT_PUBLIC_SITE_URL=https://<your-subdomain>.trycloudflare.com
 *   TRUSTED_ORIGIN_HOSTS=<your-subdomain>.trycloudflare.com
 * Then restart `npm run dev`.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function readPort() {
  const flag = process.argv.indexOf("--port");
  if (flag !== -1 && process.argv[flag + 1]) {
    return process.argv[flag + 1];
  }

  for (const file of [".env.local", ".env"]) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    const match = readFileSync(path, "utf8").match(/^PORT=(\d+)/m);
    if (match) return match[1];
  }

  return "3000";
}

const port = readPort();
const target = `http://localhost:${port}`;

console.log(`[tunnel] Starting Cloudflare quick tunnel -> ${target}`);
console.log("[tunnel] Copy the https://….trycloudflare.com URL into .env.local");

const child = spawn("cloudflared", ["tunnel", "--url", target], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 0));
