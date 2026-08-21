import "server-only";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api/errors";
import {
  batchRegistrationErrorMessage,
  isBatchRegistrationBlocked,
} from "@/lib/batch-restriction";
import type { SafeUser } from "@/lib/auth/access";
import { sendMail } from "@/lib/email/mailer";
import { registrationEmail } from "@/lib/email/templates";
import { normalizeEvent } from "@/lib/services/events";
import type { EventInfo, FormSection } from "@/lib/types/event";

/**
 * Event registration, ported from `controllers/registration/addRegistration.js`.
 *
 * Preserved from the v2 behaviour of that file: everyone registers "teamless"
 * with a generated `SOLO-…` team code and the placeholder team name
 * `UNAFFILIATED`; forming or joining a team is a separate step afterwards.
 *
 * Structural fixes:
 *  - The whole write is one `$transaction`. The original updated the
 *    registration, the tracker and the user's `regForm` in sequence, so a
 *    failure partway left a registration that the tracker did not know about
 *    (and the user unable to retry, because the duplicate check then rejected).
 *  - Capacity is checked inside the transaction. Checking it beforehand let two
 *    concurrent requests both pass the check and oversubscribe the event.
 *  - `isRegistrationClosed`/`isEventPast` were compared against the *string*
 *    `'true'`, so a real boolean `true` in the document did not close
 *    registration at all.
 */

const UNAFFILIATED = "UNAFFILIATED";

export type SubmittedSection = {
  name?: string;
  fields?: Array<{ name?: string; value?: unknown; type?: string }>;
};

function soloTeamCode(userId: string): string {
  return `SOLO-${userId}-${randomInt(1000, 10000)}`;
}

/** Truthy for boolean `true` and for the string `"true"` the old admin UI wrote. */
function isTrue(value: unknown): boolean {
  return value === true || value === "true";
}

export type RegistrationResult = {
  registrationId: string;
  teamCode: string;
  teamName: string;
  eventTitle: string;
};

export async function registerForEvent(input: {
  user: SafeUser;
  formId: string;
  sections: SubmittedSection[];
}): Promise<RegistrationResult> {
  const { user, formId } = input;
  const sections = input.sections.filter(
    (section): section is SubmittedSection => section != null,
  );

  if (!/^[a-f\d]{24}$/i.test(formId)) {
    throw new ApiError(400, "Invalid event id");
  }

  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: { formAnalytics: true },
  });
  if (!form) throw new ApiError(404, "Event not found");

  const info = (form.info ?? {}) as EventInfo;
  const event = normalizeEvent({ id: form.id, info: form.info });
  const tracker = form.formAnalytics[0] ?? null;

  // --- Eligibility -------------------------------------------------------
  if (isTrue(info.isRegistrationClosed) || isTrue(info.isEventPast)) {
    throw new ApiError(
      409,
      "Registration has closed for this event. If you think this is a mistake, email fedkiit@gmail.com.",
    );
  }

  if (info.isPublic === false && user.access !== "ADMIN") {
    throw new ApiError(403, "This form is not open for registration.");
  }

  if (isBatchRegistrationBlocked(user.email)) {
    throw new ApiError(400, batchRegistrationErrorMessage());
  }

  const alreadyRegistered =
    tracker?.regUserEmails.includes(user.email) || user.regForm.includes(formId);
  if (alreadyRegistered) {
    throw new ApiError(409, "You have already registered for this event.");
  }

  // --- Prerequisite event ------------------------------------------------
  const relatedEventId = info.relatedEvent;
  if (relatedEventId && relatedEventId !== "null") {
    const related = await prisma.form.findUnique({
      where: { id: relatedEventId },
      include: { formAnalytics: true },
    });
    if (!related) throw new ApiError(409, "The prerequisite event no longer exists");

    const registeredInRelated =
      user.regForm.includes(relatedEventId) ||
      related.formAnalytics[0]?.regUserEmails.includes(user.email);

    if (!registeredInRelated) {
      const title =
        (related.info as EventInfo)?.eventTitle ?? "the prerequisite event";
      throw new ApiError(409, `You must register for ${title} first.`);
    }
  }

  // --- Required fields ---------------------------------------------------
  assertRequiredFieldsPresent(
    (form.sections ?? []) as FormSection[],
    sections,
  );

  const teamCode = soloTeamCode(user.id);
  const capacity = Number.parseInt(String(info.eventMaxReg ?? ""), 10);

  // Cast to Prisma's JSON input type: `sections` is user-supplied data whose
  // field values are `unknown`, which Prisma's structural `InputJsonValue`
  // cannot verify statically. The shape is validated by the route's Zod schema.
  const submission = {
    user_name: user.name,
    user_id: user.id,
    user_email: user.email,
    date_time: new Date().toISOString(),
    amount: String(info.eventAmount ?? "0"),
    sections,
  } as unknown as Prisma.InputJsonValue;

  const registrationId = await prisma.$transaction(async (tx) => {
    // Re-read the tracker inside the transaction so the capacity check sees
    // concurrent writes rather than a stale snapshot.
    const current = await tx.registrationTracker.findUnique({
      where: { formId },
      select: {
        id: true,
        regUserEmails: true,
        regTeamNames: true,
        totalRegistrationCount: true,
      },
    });

    if (current?.regUserEmails.includes(user.email)) {
      throw new ApiError(409, "You have already registered for this event.");
    }

    if (Number.isFinite(capacity) && capacity > 0) {
      const taken =
        current?.regUserEmails.length ?? current?.totalRegistrationCount ?? 0;
      if (taken >= capacity) {
        throw new ApiError(409, "This event is full.");
      }
    }

    const registration = await tx.formRegistration.create({
      data: {
        formId,
        userId: user.id,
        value: [submission],
        regTeamMemEmails: [user.email],
        teamSize: 1,
        teamName: UNAFFILIATED,
        teamCode,
      },
      select: { id: true },
    });

    if (current) {
      await tx.registrationTracker.update({
        where: { formId },
        data: {
          regUserEmails: { push: user.email },
          totalRegistrationCount: { increment: 1 },
        },
      });
    } else {
      await tx.registrationTracker.create({
        data: {
          formId,
          regUserEmails: [user.email],
          regTeamNames: [],
          totalRegistrationCount: 1,
          totalClickCount: 0,
          faildAttempt: [],
          faildAttemptCount: 0,
        },
      });
    }

    await tx.user.update({
      where: { id: user.id },
      data: { regForm: { push: formId } },
    });

    return registration.id;
  });

  // Best-effort confirmation — a mail failure must not undo a valid registration.
  const mail = registrationEmail({
    name: user.name ?? "there",
    eventTitle: event.title,
    eventDate: event.dateLabel,
  });
  void sendMail({ to: user.email, ...mail });

  return {
    registrationId,
    teamCode,
    teamName: UNAFFILIATED,
    eventTitle: event.title,
  };
}

/**
 * Checks that every field the form marks `required` came back with a value.
 *
 * The original `validateCurrentForm` took `userSubmittedSections` as a parameter
 * and never looked at it, so a client could submit an empty section array and
 * the registration was accepted.
 */
function assertRequiredFieldsPresent(
  definition: FormSection[],
  submitted: SubmittedSection[],
): void {
  const provided = new Map<string, unknown>();
  for (const section of submitted) {
    for (const field of section.fields ?? []) {
      if (field?.name) provided.set(field.name, field.value);
    }
  }

  const missing: string[] = [];
  for (const section of definition) {
    for (const field of section.fields ?? []) {
      if (!field?.required || !field.name) continue;
      const value = provided.get(field.name);
      const empty =
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0);
      if (empty) missing.push(field.label || field.name);
    }
  }

  if (missing.length > 0) {
    throw new ApiError(
      422,
      `Please fill in: ${missing.join(", ")}`,
      [{ missing }],
    );
  }
}

/** The signed-in user's registrations, newest first. */
export async function getMyRegistrations(userId: string) {
  const rows = await prisma.formRegistration.findMany({
    where: { userId },
    include: { form: { select: { id: true, info: true } } },
  });

  return rows
    .map((row) => ({
      registrationId: row.id,
      teamName: row.teamName,
      teamCode: row.teamCode,
      teamSize: row.teamSize,
      teammates: row.regTeamMemEmails,
      event: normalizeEvent({ id: row.form.id, info: row.form.info }),
    }))
    .sort(
      (a, b) =>
        (b.event.date?.getTime() ?? 0) - (a.event.date?.getTime() ?? 0),
    );
}

/** Whether a user already holds a registration for a form. */
export async function hasRegistered(
  userId: string,
  formId: string,
): Promise<boolean> {
  if (!/^[a-f\d]{24}$/i.test(formId)) return false;
  const found = await prisma.formRegistration.findFirst({
    where: { userId, formId },
    select: { id: true },
  });
  return found !== null;
}
