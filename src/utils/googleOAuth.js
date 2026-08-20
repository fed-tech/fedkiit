export const GOOGLE_OAUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";

export const isGoogleOAuthEnabled = () => Boolean(GOOGLE_OAUTH_CLIENT_ID);
