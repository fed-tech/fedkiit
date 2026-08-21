/**
 * Client-side mirror of `lib/batch-restriction.ts` (pure helpers only).
 */

export function currentBatchEmailPrefix(now = new Date()) {
  return String(now.getFullYear()).slice(-2);
}

export function emailLocalPart(email) {
  return email.split("@")[0]?.trim().toLowerCase() ?? "";
}

export function isCurrentBatchEmail(email, now = new Date()) {
  if (!email) return false;
  const local = emailLocalPart(email);
  const prefix = currentBatchEmailPrefix(now);
  return local.length >= prefix.length && local.startsWith(prefix);
}

export function batchRegistrationErrorMessage(now = new Date()) {
  const year = now.getFullYear();
  const prefix = currentBatchEmailPrefix(now);
  return `Registration is not open for ${year} batch students (emails starting with ${prefix}). If you feel this is an error, contact fedkiit@gmail.com.`;
}

export function isBatchRegistrationBlocked(email, now = new Date()) {
  return isCurrentBatchEmail(email, now);
}

/** Strip common markdown syntax for short card previews. */
export function stripMarkdownForPreview(text, maxLength = 160) {
  if (!text) return "";
  const plain = String(text)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}…`;
}
