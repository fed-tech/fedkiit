import "server-only";

import { SignJWT, jwtVerify } from "jose";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api/errors";
import { getEnv } from "@/lib/env";
import {
  batchAttendanceQrBlockedMessage,
  isBatchAttendanceQrBlocked,
  registrationDateFromSubmission,
} from "@/lib/batch-restriction";
import type { SafeUser } from "@/lib/auth/access";
import type { EventInfo } from "@/lib/types/event";

/**
 * QR tokens are signed with the same secret and 20-minute lifetime the Express
 * controller used (`jwt.sign({ attendanceToken }, JWT_SECRET, { expiresIn: "20m" })`),
 * so a code minted by either implementation verifies against the other.
 */
const secret = () => new TextEncoder().encode(getEnv().JWT_SECRET);

async function signAttendanceToken(attendanceId: string): Promise<string> {
  return new SignJWT({ attendanceToken: attendanceId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("20m")
    .sign(secret());
}

type AttendanceInfo = {
  user_name?: string;
  user_email?: string;
  user_id?: string;
};

function attendeeFromRecord(
  record: {
    teamName: string;
    teamCode: string;
    info: unknown;
    userId: string;
  },
  user?: { name: string | null; email: string | null; rollNumber: string | null } | null,
) {
  const info = (record.info ?? {}) as AttendanceInfo;
  return {
    name: info.user_name || user?.name || "",
    email: info.user_email || user?.email || "",
    rollNumber: user?.rollNumber || "",
    teamName: record.teamName,
    teamCode: record.teamCode,
  };
}

/** RFC 4180 escaping — quotes doubled, fields with delimiters quoted. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  return "﻿" + lines.join("\r\n");
}

const registrationSelect = {
  teamName: true,
  teamCode: true,
  value: true,
  userId: true,
} as const;

function userIsOnRegistration(
  registration: { userId: string; value: unknown[] },
  userId: string,
): boolean {
  if (registration.userId === userId) return true;
  return (registration.value as Array<{ user_id?: string }>).some(
    (v) => v?.user_id === userId,
  );
}

/** Participant count across all teams for a form. */
async function countRegisteredParticipants(formId: string): Promise<number> {
  const registrations = await prisma.formRegistration.findMany({
    where: { formId },
    select: { userId: true, value: true },
  });

  const userIds = new Set<string>();
  for (const registration of registrations) {
    userIds.add(registration.userId);
    for (const entry of registration.value ?? []) {
      const uid = (entry as { user_id?: string })?.user_id;
      if (uid) userIds.add(uid);
    }
  }
  return userIds.size;
}

function submissionInfoForUser(
  registration: {
    userId: string;
    value: unknown[];
  },
  user: SafeUser,
): AttendanceInfo | undefined {
  const fromValue = (registration.value as AttendanceInfo[]).find(
    (v) => v?.user_id === user.id,
  );
  if (fromValue) return fromValue;

  if (registration.userId === user.id) {
    const first = registration.value?.[0] as AttendanceInfo | undefined;
    if (first) return { ...first, user_id: user.id };
    return {
      user_id: user.id,
      user_name: user.name ?? undefined,
      user_email: user.email ?? undefined,
    };
  }

  return {
    user_id: user.id,
    user_name: user.name ?? undefined,
    user_email: user.email ?? undefined,
  };
}

/** Finds the registration row for a user on a form (solo leader or team member). */
async function findUserRegistration(
  formId: string,
  user: SafeUser,
  teamCode?: string | null,
) {
  if (teamCode && teamCode.trim() !== "") {
    const registration = await prisma.formRegistration.findFirst({
      where: { formId, teamCode: teamCode.trim() },
      select: registrationSelect,
    });
    if (!registration) {
      throw new ApiError(404, "Form registration not found.");
    }
    if (!userIsOnRegistration(registration, user.id)) {
      throw new ApiError(403, "You are not registered for this team.");
    }
    return registration;
  }

  // Fast path: user registered solo or as team leader (userId on the row).
  const owned = await prisma.formRegistration.findFirst({
    where: { formId, userId: user.id },
    select: registrationSelect,
  });
  if (owned) return owned;

  // Team member: scan registrations for this form only (value[] holds members).
  const teams = await prisma.formRegistration.findMany({
    where: { formId },
    select: registrationSelect,
  });
  const memberOf = teams.find((reg) =>
    (reg.value as Array<{ user_id?: string }>).some(
      (v) => v?.user_id === user.id,
    ),
  );
  if (!memberOf) {
    throw new ApiError(404, "Form registration not found for the user.");
  }
  return memberOf;
}

/**
 * The caller's attendance token for an event — encoded into their QR code.
 * Returns a signed JWT (20 min), not the raw record id.
 */
export async function getAttendanceCode(
  formId: string,
  user: SafeUser,
  teamCode?: string | null,
) {
  if (!/^[a-f\d]{24}$/i.test(formId)) throw new ApiError(404, "Form not found");

  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { id: true },
  });
  if (!form) throw new ApiError(404, "Form not found");

  const registration = await findUserRegistration(formId, user, teamCode);

  const registeredAt = registrationDateFromSubmission(registration);
  if (isBatchAttendanceQrBlocked(user.email, registeredAt)) {
    throw new ApiError(403, batchAttendanceQrBlockedMessage(), [
      { code: "BATCH_QR_BLOCKED" },
    ]);
  }

  const info = submissionInfoForUser(registration, user);

  const attendanceData = {
    formId,
    userId: user.id,
    teamName: registration.teamName,
    teamCode: registration.teamCode,
    info,
  };

  const uniqueKey = {
    formId,
    userId: user.id,
    teamCode: registration.teamCode,
  };

  const existing = await prisma.attendance.findUnique({
    where: { formId_userId_teamCode: uniqueKey },
    select: { id: true, isPresent: true },
  });

  if (existing?.isPresent) {
    throw new ApiError(400, "Attendance already marked.", [
      { code: "ALREADY_MARKED" },
    ]);
  }

  const record = existing
    ? existing
    : await prisma.attendance.create({
        data: attendanceData as never,
        select: { id: true, isPresent: true },
      });

  if (existing && info) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: { info },
    });
  }

  const token = await signAttendanceToken(record.id);

  return { message: "Validation id generated successfully.", attendanceToken: token };
}

export type MarkAttendanceResult = {
  message: string;
  alreadyMarked: boolean;
  attendance: {
    id: string;
    formId: string;
    teamName: string;
    teamCode: string;
    isPresent: boolean;
    markedAt: Date | null;
  };
  attendee: {
    name: string;
    email: string;
    rollNumber: string;
    teamName: string;
    teamCode: string;
  };
};

/**
 * Marks a scanned attendance record present.
 * Uses an atomic conditional update to prevent duplicate marks under concurrency.
 */
export async function markAttendance(input: {
  formId?: string;
  token?: string;
}): Promise<MarkAttendanceResult> {
  const token = input.token?.trim();
  if (!token) throw new ApiError(400, "Attendance token is required.");

  if (!input.formId || !/^[a-f\d]{24}$/i.test(input.formId)) {
    throw new ApiError(400, "Valid event ID is required.");
  }

  let attendanceId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
    });
    attendanceId = payload.attendanceToken as string | undefined;
  } catch {
    throw new ApiError(401, "Invalid or expired QR.", [{ code: "INVALID_QR" }]);
  }

  if (!attendanceId || !/^[a-f\d]{24}$/i.test(attendanceId)) {
    throw new ApiError(401, "Invalid or expired QR.", [{ code: "INVALID_QR" }]);
  }

  const markedAt = new Date();
  const updated = await prisma.attendance.updateMany({
    where: {
      id: attendanceId,
      formId: input.formId,
      isPresent: false,
    },
    data: { isPresent: true, markedAt },
  });

  if (updated.count === 1) {
    const record = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      select: {
        id: true,
        formId: true,
        teamName: true,
        teamCode: true,
        isPresent: true,
        markedAt: true,
        info: true,
        userId: true,
      },
    });
    if (!record) {
      throw new ApiError(404, "Attendance record not found.", [{ code: "NOT_FOUND" }]);
    }

    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { name: true, email: true, rollNumber: true },
    });

    return {
      message: "Attendance marked successfully.",
      alreadyMarked: false,
      attendance: {
        id: record.id,
        formId: record.formId,
        teamName: record.teamName,
        teamCode: record.teamCode,
        isPresent: record.isPresent,
        markedAt: record.markedAt,
      },
      attendee: attendeeFromRecord(record, user),
    };
  }

  const record = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    select: {
      id: true,
      formId: true,
      teamName: true,
      teamCode: true,
      isPresent: true,
      markedAt: true,
      info: true,
      userId: true,
    },
  });

  if (!record) {
    throw new ApiError(404, "Attendance record not found.", [{ code: "NOT_FOUND" }]);
  }
  if (record.formId !== input.formId) {
    throw new ApiError(400, "QR does not belong to this event.", [
      { code: "WRONG_EVENT" },
    ]);
  }
  if (record.isPresent) {
    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { name: true, email: true, rollNumber: true },
    });
    return {
      message: "Attendance already marked.",
      alreadyMarked: true,
      attendance: {
        id: record.id,
        formId: record.formId,
        teamName: record.teamName,
        teamCode: record.teamCode,
        isPresent: record.isPresent,
        markedAt: record.markedAt,
      },
      attendee: attendeeFromRecord(record, user),
    };
  }

  throw new ApiError(409, "Could not mark attendance. Please scan again.", [
    { code: "CONFLICT" },
  ]);
}

/** Lightweight event list for the attendance scanner page (no sections payload). */
export async function listAttendanceEvents() {
  const forms = await prisma.form.findMany({
    select: { id: true, info: true },
    orderBy: { id: "desc" },
  });
  return forms;
}

/** Present / total counts for an event — shown while scanning. */
export async function getAttendanceStats(formId: string) {
  if (!/^[a-f\d]{24}$/i.test(formId)) throw new ApiError(404, "Form not found");

  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { id: true },
  });
  if (!form) throw new ApiError(404, "Form not found");

  const [registered, present] = await Promise.all([
    countRegisteredParticipants(formId),
    prisma.attendance.count({ where: { formId, isPresent: true } }),
  ]);

  return { registered, present };
}

export type StoredField = { name?: string; type?: string; value?: unknown };
export type StoredSubmission = {
  user_name?: string;
  user_email?: string;
  date_time?: string;
  amount?: string;
  sections?: Array<{ name?: string; fields?: StoredField[] }>;
};

const isHttpUrl = (v: unknown): v is string =>
  typeof v === "string" && /^https?:\/\//i.test(v);

export function paymentFromSubmission(submission: StoredSubmission): {
  utr: string;
  screenshot: string | null;
} {
  const fields = (submission.sections ?? []).flatMap((section) =>
    Array.isArray(section?.fields) ? section.fields : [],
  );

  const utr = fields.find((f) => /utr|transaction/i.test(f?.name ?? ""));
  const screenshot = fields.find(
    (f) => (f?.type === "image" || f?.type === "file") && isHttpUrl(f?.value),
  );

  return {
    utr: utr?.value == null ? "" : String(utr.value),
    screenshot: isHttpUrl(screenshot?.value) ? screenshot.value : null,
  };
}

function flattenRegistration(row: {
  teamName: string;
  teamCode: string;
  teamSize: number;
  regTeamMemEmails: string[];
  value: unknown[];
}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    teamName: row.teamName,
    teamCode: row.teamCode,
    teamSize: row.teamSize,
    teamMembers: row.regTeamMemEmails.join("; "),
  };

  for (const submission of row.value ?? []) {
    const s = submission as {
      user_name?: string;
      user_email?: string;
      date_time?: string;
      amount?: string;
      sections?: Array<{ fields?: Array<{ name?: string; value?: unknown }> }>;
    };

    out.name ??= s.user_name;
    out.email ??= s.user_email;
    out.registeredAt ??= s.date_time;
    out.amount ??= s.amount;

    for (const section of s.sections ?? []) {
      for (const field of section.fields ?? []) {
        if (field?.name && out[field.name] === undefined) {
          out[field.name] = field.value;
        }
      }
    }
  }

  return out;
}

export async function exportRegistrations(formId: string) {
  if (!/^[a-f\d]{24}$/i.test(formId)) throw new ApiError(404, "Form not found");

  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { info: true },
  });
  if (!form) throw new ApiError(404, "Form not found");

  const registrations = await prisma.formRegistration.findMany({
    where: { formId },
    select: {
      teamName: true,
      teamCode: true,
      teamSize: true,
      regTeamMemEmails: true,
      value: true,
    },
  });

  const title = ((form.info ?? {}) as EventInfo).eventTitle ?? "registrations";
  return {
    filename: `${title.replace(/[^\w\-]+/g, "_")}_registrations.csv`,
    csv: toCsv(registrations.map(flattenRegistration)),
    count: registrations.length,
  };
}

export async function exportAttendance(formId: string) {
  if (!/^[a-f\d]{24}$/i.test(formId)) throw new ApiError(404, "Form not found");

  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { info: true },
  });
  if (!form) throw new ApiError(404, "Form not found");

  const records = await prisma.attendance.findMany({
    where: { formId },
    select: {
      userId: true,
      teamName: true,
      teamCode: true,
      isPresent: true,
      isPaymentVerified: true,
      markedAt: true,
    },
  });

  const userIds = [...new Set(records.map((r) => r.userId))];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, rollNumber: true },
      })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));

  const registrations = await prisma.formRegistration.findMany({
    where: { formId },
    select: { userId: true, value: true },
  });
  const paymentByUser = new Map<
    string,
    { utr: string; screenshot: string | null }
  >();
  for (const registration of registrations) {
    for (const entry of registration.value ?? []) {
      const payment = paymentFromSubmission(entry as StoredSubmission);
      if (payment.utr || payment.screenshot) {
        paymentByUser.set(registration.userId, payment);
        break;
      }
    }
  }

  const rows = records.map((r) => {
    const u = byId.get(r.userId);
    const payment = paymentByUser.get(r.userId);
    return {
      name: u?.name ?? "",
      email: u?.email ?? "",
      rollNumber: u?.rollNumber ?? "",
      teamName: r.teamName,
      teamCode: r.teamCode,
      isPresent: r.isPresent ? "YES" : "NO",
      isPaymentVerified: r.isPaymentVerified ? "YES" : "NO",
      markedAt: r.markedAt ? r.markedAt.toISOString() : "",
      utr: payment?.utr ?? "",
      paymentScreenshot: payment?.screenshot ?? "",
    };
  });

  const title = ((form.info ?? {}) as EventInfo).eventTitle ?? "attendance";
  return {
    filename: `${title.replace(/[^\w\-]+/g, "_")}_attendance.csv`,
    csv: toCsv(rows),
    count: rows.length,
  };
}
