import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api/errors";
import { sendMail } from "@/lib/email/mailer";
import { siteUrl } from "@/lib/env";

/**
 * Certificates.
 *
 * Ports controllers/certificate/*. The data model is unchanged:
 *   Certificate         — one template per event: an image plus field positions
 *   issuedCertificates  — one row per recipient, with their field values
 *
 * Rendering note: the Express version composited the finished image server-side
 * with `canvas` and `puppeteer`. Neither is used here — both are heavyweight
 * native dependencies that do not deploy cleanly to a serverless runtime, and
 * `puppeteer` alone pulls a full Chromium download.
 *
 * Instead the template URL and the field coordinates are returned, and the
 * client composites onto a canvas — which is exactly what CertificatesForm.jsx
 * and CertificatePreview.jsx already do for the live preview, using html2canvas.
 * The stored `imageSrc` is still honoured when a row already has one.
 */

export type CertificateField = {
  x: number;
  y: number;
  fieldName: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
};

/** Public certificate lookup, used by /verify/certificate. */
export async function verifyCertificate(certificateId: string) {
  const id = certificateId?.trim();
  if (!id) throw new ApiError(400, "Certificate ID is required");

  const issued = await prisma.issuedCertificates.findFirst({
    where: { OR: [{ id: /^[a-f\d]{24}$/i.test(id) ? id : undefined }, { certificateId: id }] },
  });

  if (!issued) throw new ApiError(404, "Certificate not found");

  const event = await prisma.event.findUnique({
    where: { id: issued.eventId },
    select: { id: true, name: true, description: true, createdAt: true },
  });

  const template = issued.certificateId
    ? await prisma.certificate.findUnique({
        where: { id: issued.certificateId },
        select: { template: true, fields: true },
      })
    : null;

  return {
    // The frontend reads `imageSrc` at the top level, then falls back to
    // compositing the template with the stored field values.
    imageSrc: issued.imageSrc ?? template?.template ?? null,
    certificate: {
      certificateId: issued.certificateId ?? issued.id,
      email: issued.email,
      fieldValues: issued.fieldValues,
      fields: issued.fields,
      mailed: issued.mailed,
    },
    template: template
      ? { image: template.template, fields: template.fields }
      : null,
    event,
  };
}

/** Creates or replaces an event's certificate template. */
export async function addCertificateTemplate(input: {
  eventId: string;
  template: string;
  fields: CertificateField[];
}) {
  if (!input.eventId) throw new ApiError(400, "Event ID is required");
  if (!input.template) throw new ApiError(400, "A template image is required");

  const resolvedEventId = await getOrCreateCertificateEventId(input.eventId);

  const existing = await prisma.certificate.findFirst({
    where: { eventId: resolvedEventId },
    select: { id: true },
  });

  const fields = input.fields as unknown as Prisma.InputJsonValue[];

  const record = existing
    ? await prisma.certificate.update({
        where: { id: existing.id },
        data: { template: input.template, fields },
      })
    : await prisma.certificate.create({
        data: { eventId: resolvedEventId, template: input.template, fields },
      });

  return record;
}

/** Template plus a sample row, for the admin preview. */
async function resolveEventId(rawEventId?: string): Promise<string | null> {
  const value = rawEventId?.trim();
  if (!value) return null;

  const byId = await prisma.event.findUnique({
    where: { id: value },
    select: { id: true },
  });
  if (byId) return byId.id;

  const byFormId = await prisma.event.findFirst({
    where: { formId: value },
    select: { id: true },
  });
  if (byFormId) return byFormId.id;

  return null;
}

/**
 * Certificate management is opened from a form id. Older deployments created
 * the companion Event in a separate Express endpoint; create it here when it
 * does not exist yet so a newly uploaded template has somewhere to live.
 */
async function getOrCreateCertificateEventId(rawEventId?: string): Promise<string> {
  const existingId = await resolveEventId(rawEventId);
  if (existingId) return existingId;

  const formId = rawEventId?.trim();
  if (!formId) throw new ApiError(400, "Event ID is required");

  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { id: true, info: true },
  });
  if (!form) throw new ApiError(404, "Event form not found");

  const configuredOrganisationId =
    process.env.CERTIFICATE_ORGANISATION_ID ?? process.env.NEXT_PUBLIC_CERT_ORG;
  const hasValidConfiguredOrganisationId = /^[a-f\d]{24}$/i.test(
    configuredOrganisationId ?? "",
  );
  const configuredOrganisation = hasValidConfiguredOrganisationId
    ? await prisma.organisation.findUnique({
        where: { id: configuredOrganisationId! },
        select: { id: true },
      })
    : null;
  const organisation =
    configuredOrganisation ??
    (await prisma.organisation.findFirst({ select: { id: true } }));

  if (!organisation) {
    throw new ApiError(400, "No organisation is available for certificate events");
  }

  const info = (form.info ?? {}) as Record<string, unknown>;
  const name = typeof info.eventTitle === "string" ? info.eventTitle : "Untitled Event";
  const description =
    typeof info.eventdescription === "string"
      ? info.eventdescription
      : typeof info.eventDescription === "string"
        ? info.eventDescription
        : "";

  const event = await prisma.event.create({
    data: { name, description, organisationId: organisation.id, formId: form.id },
    select: { id: true },
  });
  return event.id;
}

export async function dummyCertificate(input: {
  eventId: string;
  fieldValues?: Record<string, string>;
}) {
  const resolvedEventId = await resolveEventId(input.eventId);
  if (!resolvedEventId) {
    throw new ApiError(404, "No certificate template exists for this event");
  }

  const template = await prisma.certificate.findFirst({
    where: { eventId: resolvedEventId },
  });
  if (!template) {
    throw new ApiError(404, "No certificate template exists for this event");
  }

  return {
    template: template.template,
    fields: template.fields,
    fieldValues: input.fieldValues ?? { name: "Sample Name" },
  };
}

/** Emails one certificate. Used for the admin's test send. */
export async function sendCertificateEmail(input: {
  to: string;
  name: string;
  eventName: string;
  certificateId: string;
  isTest?: boolean;
}) {
  const verifyUrl = `${siteUrl()}/verify/certificate?id=${encodeURIComponent(input.certificateId)}`;

  const escape = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return sendMail({
    to: input.to,
    subject: `Your certificate for ${input.eventName}`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:'Open Sans',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#1c1c1c;background-image:linear-gradient(260deg,#ffbe0b -29.7%,#f42b03 128.34%);padding:24px 32px;">
<p style="margin:0;font-size:20px;font-weight:700;color:#fff;">FED KIIT</p></td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 14px;font-size:19px;color:#1c1c1c;">Your certificate is ready</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3f3f46;">
Hi ${escape(input.name)}, thank you for taking part in
<strong>${escape(input.eventName)}</strong>. Your certificate is available below.</p>
${input.isTest ? `<p style="margin:0;font-size:13px;color:#6b7280;">This is a test email. A certificate is not issued until you use Send Mail.</p>` : `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>
<td style="border-radius:8px;background:#ff8a00;">
<a href="${verifyUrl}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#1c1c1c;text-decoration:none;">View certificate</a>
</td></tr></table>
<p style="margin:0;font-size:13px;color:#6b7280;">Certificate ID: ${escape(input.certificateId)}</p>`}
</td></tr></table></td></tr></table></body></html>`,
  });
}

/**
 * Issues certificates to a list of recipients and emails them.
 *
 * Recipients already holding a row for the event are skipped rather than
 * duplicated, so a re-run after a partial failure is safe.
 */
export async function sendCertificatesAndEvents(input: {
  eventId: string;
  recipients: Array<{ email: string; fieldValues?: Record<string, string> }>;
  resend?: boolean;
}) {
  if (!input.eventId) throw new ApiError(400, "Event ID is required");
  if (!Array.isArray(input.recipients) || input.recipients.length === 0) {
    throw new ApiError(400, "At least one recipient is required");
  }

  const resolvedEventId = await getOrCreateCertificateEventId(input.eventId);

  const event = await prisma.event.findUnique({
    where: { id: resolvedEventId },
    select: { id: true, name: true },
  });
  if (!event) throw new ApiError(404, "Event not found");

  const template = await prisma.certificate.findFirst({
    where: { eventId: resolvedEventId },
  });
  if (!template) {
    throw new ApiError(404, "No certificate template exists for this event");
  }

  const existing = await prisma.issuedCertificates.findMany({
    where: { eventId: resolvedEventId },
    select: { id: true, email: true, mailed: true },
  });
  const existingByEmail = new Map(
    existing.map((certificate) => [certificate.email.toLowerCase(), certificate]),
  );

  let issued = 0;
  let skipped = 0;
  let mailed = 0;
  const failures: Array<{ email: string; error: string }> = [];

  for (const recipient of input.recipients) {
    const email = recipient.email?.trim().toLowerCase();
    if (!email) continue;

    const existingCertificate = existingByEmail.get(email);
    if (existingCertificate?.mailed && !input.resend) {
      skipped++;
      continue;
    }

    const record =
      existingCertificate ??
      (await prisma.issuedCertificates.create({
        data: {
          eventId: resolvedEventId,
          certificateId: template.id,
          email,
          fields: template.fields as Prisma.InputJsonValue[],
          fieldValues: (recipient.fieldValues ?? {}) as Prisma.InputJsonValue,
          mailed: false,
        },
      }));
    if (!existingCertificate) issued++;

    const result = await sendCertificateEmail({
      to: email,
      name: recipient.fieldValues?.name ?? email,
      eventName: event.name,
      certificateId: record.id,
    });

    if (result.sent) {
      mailed++;
      await prisma.issuedCertificates.update({
        where: { id: record.id },
        data: { mailed: true },
      });
    } else {
      failures.push({ email, error: result.reason });
    }
  }

  return { issued, skipped, mailed, failures, total: input.recipients.length };
}
