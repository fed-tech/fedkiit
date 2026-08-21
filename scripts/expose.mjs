#!/usr/bin/env node
/**
 * Expose the local dev server with ngrok.
 *
 *   npm run expose
 *
 * Copy the https URL into `.env.local`:
 *   NEXT_PUBLIC_SITE_URL=https://….ngrok-free.app
 *   TRUSTED_ORIGIN_HOSTS=….ngrok-free.app
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
  if (flag !== -1 && process.argv[flag + 1]) return process.argv[flag + 1];

  for (const file of [".env.local", ".env"]) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    const match = readFileSync(path, "utf8").match(/^PORT=(\d+)/m);
    if (match) return match[1];
  }
  return "3000";
}

const port = readPort();
console.log(`[expose] ngrok http ${port}`);
console.log("[expose] Dashboard: http://127.0.0.1:4040");
console.log("[expose] Same Wi‑Fi LAN: http://<your-ip>:" + port);
console.log(
  "[expose] Add the new ngrok hostname to TRUSTED_ORIGIN_HOSTS in .env.local, then restart npm run dev",
);

const child = spawn("ngrok", ["http", port], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => process.exit(code ?? 0));
