/** Dedicated door-duty account — sidebar shows only the attendance scanner. */
export const ATTENDANCE_SCANNER_EMAIL = "attendance@fedkiit.com";

export function isAttendanceScanner(
  user: Pick<{ email: string }, "email"> | null | undefined,
): boolean {
  if (!user) return false;
  return user.email.toLowerCase() === ATTENDANCE_SCANNER_EMAIL.toLowerCase();
}
