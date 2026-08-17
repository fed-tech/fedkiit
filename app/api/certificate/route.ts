import { dummyCertificate } from "@/lib/services/certificates";
import { body, expressError, handle, json } from "@/lib/api/express";
import { getCurrentUser, isAdmin } from "@/lib/auth/access";

/**
 * POST /api/certificate/dummyCertificate
 * Port of controllers/certificate/testNameController.js — preview data for the
 * admin certificate designer.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return expressError(401, "Token is required");
    if (!isAdmin(user)) return expressError(403, "Unauthorized");

    const b = await body<{
      eventId?: string;
      fieldValues?: Record<string, string>;
    }>(request);

    const data = await dummyCertificate({
      eventId: b.eventId ?? "",
      fieldValues: b.fieldValues,
    });

    return json({ success: true, ...data });
  });
}
