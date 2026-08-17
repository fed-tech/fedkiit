import { sendCertificatesAndEvents } from "@/lib/services/certificates";
import { body, expressError, handle, json } from "@/lib/api/express";
import { getCurrentUser, isAdmin } from "@/lib/auth/access";

/**
 * POST /api/certificate/sendCertificatesAndEvents
 * Port of controllers/certificate/eventCertificateController.js — admin only.
 *
 * Recipients who already hold a certificate for the event are skipped rather
 * than issued a duplicate, so re-running after a partial failure is safe.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return expressError(401, "Token is required");
    if (!isAdmin(user)) return expressError(403, "Unauthorized");

    const b = await body<{
      eventId?: string;
      recipients?: Array<{ email: string; fieldValues?: Record<string, string> }>;
      emails?: string[];
      resend?: boolean;
    }>(request);

    // Accepts either a rich recipient list or a plain array of addresses.
    const recipients =
      b.recipients ??
      (b.emails ?? []).map((email) => ({ email, fieldValues: {} }));

    const data = await sendCertificatesAndEvents({
      eventId: b.eventId ?? "",
      recipients,
      resend: b.resend === true,
    });

    const status = data.failures.length > 0 ? 207 : 200;
    return json(
      {
        success: data.failures.length === 0,
        message:
          data.failures.length > 0
            ? "Some certificates could not be emailed"
            : "Certificates sent successfully",
        data,
        failed: data.failures,
      },
      status,
    );
  });
}

