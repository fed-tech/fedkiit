import { sendCertificateEmail } from "@/lib/services/certificates";
import { body, expressError, handle, json } from "@/lib/api/express";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/api/rate-limit";
import { getCurrentUser, isAdmin } from "@/lib/auth/access";

/**
 * POST /api/certificate/testCertificateSending
 * Port of controllers/certificate/testNameController.js — sends one test email
 * without issuing a real certificate row.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return expressError(401, "Token is required");
    if (!isAdmin(user)) return expressError(403, "Unauthorized");

    await enforceRateLimit({ ...RATE_LIMITS.otpRequest, subject: user.id });

    const b = await body<Record<string, string>>(request);
    const to = (b.email ?? user.email).trim().toLowerCase();

    const result = await sendCertificateEmail({
      to,
      name: b.name ?? user.name ?? to,
      eventName: b.eventName ?? "a FED KIIT event",
      certificateId: b.certificateId ?? "TEST-CERTIFICATE",
      isTest: true,
    });

    if (!result.sent) {
      return expressError(502, result.reason || "Could not send the test email");
    }

    return json({ success: true, message: `Test certificate sent to ${to}` });
  });
}
