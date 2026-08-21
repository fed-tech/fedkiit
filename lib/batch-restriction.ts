/**
 * Blocks the current academic year's intake batch from registering for events.
 *
 * KIIT student emails start with the two-digit intake year (e.g. `26…@` for the
 * 2026 batch). The prefix follows the calendar year automatically, so in 2027
 * emails starting with `27` are restricted instead.
 *
 * Registrations that slipped through before this rule shipped must not receive
 * attendance QR codes — see `isBatchAttendanceQrBlocked`.
 */

const DEFAULT_RESTRICTION_ENABLED_AT = "2026-08-21T00:00:00.000Z";

/** When the restriction went live — registrations before this may exist but get no QR. */
export function batchRestrictionEnabledAt(): Date {
  const raw =
    process.env.BATCH_REGISTRATION_RESTRICTION_ENABLED_AT ??
    DEFAULT_RESTRICTION_ENABLED_AT;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? new Date(DEFAULT_RESTRICTION_ENABLED_AT)
    : parsed;
}

/** Two-digit prefix for the current calendar year's batch (e.g. `"26"` in 2026). */
export function currentBatchEmailPrefix(now: Date = new Date()): string {
  return String(now.getFullYear()).slice(-2);
}

export function emailLocalPart(email: string): string {
  return email.split("@")[0]?.trim().toLowerCase() ?? "";
}

/** True when the mailbox local-part starts with this year's batch digits. */
export function isCurrentBatchEmail(
  email: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!email) return false;
  const local = emailLocalPart(email);
  const prefix = currentBatchEmailPrefix(now);
  return local.length >= prefix.length && local.startsWith(prefix);
}

export function batchRegistrationErrorMessage(now: Date = new Date()): string {
  const year = now.getFullYear();
  const prefix = currentBatchEmailPrefix(now);
  return `Registration is not open for ${year} batch students (emails starting with ${prefix}). If you feel this is an error, contact fedkiit@gmail.com.`;
}

export function batchAttendanceQrBlockedMessage(now: Date = new Date()): string {
  const year = now.getFullYear();
  return `Attendance QR codes are not available for ${year} batch registrations made before the restriction was applied. Please contact fedkiit@gmail.com if you need help.`;
}

export function isBatchRegistrationBlocked(
  email: string | null | undefined,
  now: Date = new Date(),
): boolean {
  return isCurrentBatchEmail(email, now);
}

type SubmissionLike = { date_time?: string };

/** Reads the ISO timestamp stored on a registration submission. */
export function registrationDateFromSubmission(registration: {
  value: unknown[];
}): Date | null {
  for (const entry of registration.value ?? []) {
    const dt = (entry as SubmissionLike)?.date_time;
    if (!dt) continue;
    const parsed = new Date(dt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

/**
 * Grandfathered current-batch registrations (made before the restriction) must
 * not receive attendance QR codes.
 */
export function isBatchAttendanceQrBlocked(
  email: string | null | undefined,
  registeredAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (!isCurrentBatchEmail(email, now)) return false;
  if (!registeredAt) return true;
  return registeredAt < batchRestrictionEnabledAt();
}
