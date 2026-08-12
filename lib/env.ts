import "server-only";

import { z } from "zod";

/**
 * Server-side environment contract.
 *
 * The Express backend read `process.env` ad hoc and failed at request time when
 * something was missing. Here the whole surface is declared once and validated
 * on first access, so a misconfigured deploy fails loudly at boot instead of
 * throwing a 500 halfway through a checkout.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  SESSION_SECRET: z.string().optional(),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  RESEND_API_KEY_2: z.string().optional(),
  EMAIL_FROM_2: z.string().optional(),

  CLOUDINARY_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_SECRET_KEY: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  CHATBOT_NAME: z.string().default("FEDI"),

  CERT_ORG: z.string().optional(),

  NEXT_PUBLIC_SITE_URL: z.string().url().default("https://www.fedkiit.com"),

  // --- Tunables that used to be literals in the code ------------------------
  // Defaults reproduce the previous hardcoded behaviour exactly, so setting
  // none of these changes nothing.

  /**
   * Digits in a one-time password.
   *
   * `NEXT_PUBLIC_` because `OtpInput` has to draw exactly this many boxes. One
   * variable read by both sides makes them impossible to desync — a
   * server-only setting here would recreate the bug where six digits were
   * emailed to a screen with four boxes.
   */
  NEXT_PUBLIC_OTP_LENGTH: z.coerce.number().int().min(4).max(10).default(4),
  /** How long an OTP stays valid, in minutes. */
  OTP_VALIDITY_MINUTES: z.coerce.number().int().min(1).max(120).default(15),

  /**
   * Extra hosts that may appear in an `Origin` header and still be used to
   * build an emailed invite link. Comma-separated. The canonical site host is
   * always trusted and does not need listing; this is for staging and preview
   * deployments.
   */
  TRUSTED_ORIGIN_HOSTS: z.string().optional(),

  /**
   * Addresses allowed to read form analytics regardless of role.
   * Comma-separated. Previously the literal `srex@fedkiit.com`.
   */
  FORM_ANALYTICS_ALLOWED_EMAILS: z.string().optional(),

  /**
   * Addresses allowed to scan QRs and mark attendance regardless of role.
   * Comma-separated. Intended for shared scanning accounts such as
   * attendance@fedkiit.com, which is a plain USER and would otherwise need
   * full ADMIN — and with it the ability to edit and delete events — just to
   * run a scanner at the door.
   */
  FORM_ATTENDANCE_ALLOWED_EMAILS: z.string().optional(),

  /**
   * Calendar month the academic year rolls over in, 1-12. July by default:
   * a student admitted in 2022 is in their 4th year until July 2026, not until
   * January 2026.
   */
  ACADEMIC_YEAR_START_MONTH: z.coerce.number().int().min(1).max(12).default(7),
  DEBUG: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

type Env = z.infer<typeof schema> & { GEMINI_API_KEYS: string[] };

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  // The backend rotated through GEMINI_API_KEY_1..10 to dodge per-key rate
  // limits. Collect whichever are present, in order.
  const geminiKeys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) geminiKeys.push(key);
  }

  cached = { ...parsed.data, GEMINI_API_KEYS: geminiKeys };
  return cached;
}

/** Canonical origin, no trailing slash — used for metadata, sitemap and email links. */
export function siteUrl(): string {
  return getEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}

/** Splits a comma-separated env value, dropping blanks and surrounding space. */
export function envList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
