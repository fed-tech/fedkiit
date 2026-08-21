#!/usr/bin/env node
/**
 * Runs the Next.js CLI with `.env` / `.env.local` loaded first.
 *
 * Why this exists: Next cannot read `PORT` from a .env file, because the HTTP
 * server boots before any application code is initialised (documented in the
 * Next CLI reference). Something has to put PORT into the environment before
 * `next` starts.
 *
 * Node's own `--env-file` flag does that, but `next build` forks worker
 * processes and forwards CLI flags through NODE_OPTIONS, where `--env-file` is
 * rejected outright ("not allowed in NODE_OPTIONS"). Spawning next as a child
 * with an explicit env avoids the flag entirely, so build, dev and start all
 * behave the same.
 *
 * Precedence, highest first:
 *   1. the real shell environment (so a host injecting PORT always wins)
 *   2. .env.local
 *   3. .env
 *
 * Usage: node scripts/with-env.mjs <dev|build|start|...> [args]
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ensurePrismaClient } from "./ensure-prisma.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

/** Minimal dotenv parser: KEY=VALUE, `#` comments, optional surrounding quotes. */
function parseEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;

  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      value.length > 1 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    if (key) out[key] = value;
  }
  return out;
}

// .env first, then .env.local on top — matching Next's own precedence.
const fileEnv = {
  ...parseEnvFile(resolve(root, ".env")),
  ...parseEnvFile(resolve(root, ".env.local")),
};

// The shell wins over both, so `PORT=4000 npm start` and platform-injected
// values still take effect.
const env = { ...fileEnv, ...process.env };

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: node scripts/with-env.mjs <dev|build|start> [args]");
  process.exit(1);
}

// Before Next starts, not after: the generated Prisma client is gitignored, so
// pulling a branch that changed schema.prisma otherwise leaves a client that no
// longer matches it — and the mismatch only shows up as a runtime error on
// whichever request touches the new field. Costs a file hash when the schema is
// unchanged, which is almost always.
if (!ensurePrismaClient(env)) process.exit(1);

const nextBin = resolve(root, "node_modules", "next", "dist", "bin", "next");

// Listen on all interfaces in dev so phones on the same Wi‑Fi can hit the LAN IP.
const nextArgs = [...args];
if (args[0] === "dev" && !nextArgs.includes("-H")) {
  nextArgs.push("-H", "0.0.0.0");
}

const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("[with-env] failed to start next:", error.message);
  process.exit(1);
});
