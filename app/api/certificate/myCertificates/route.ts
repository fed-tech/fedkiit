import { prisma } from "@/lib/db";
import { expressError, handle, json } from "@/lib/api/express";
import { getCurrentUser } from "@/lib/auth/access";

export async function GET(request: Request) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return expressError(401, "Token is required");

    const email = user.email.toLowerCase().trim();

    const issued = await prisma.issuedCertificates.findMany({
      where: { email },
      include: { event: true },
    });

    const myCertificates = issued
      .filter((row) => row.event && row.event.formId)
      .map((row) => ({
        formId: row.event.formId,
        certificateId: row.id,
        eventId: row.eventId,
      }));

    return json(myCertificates);
  });
}
