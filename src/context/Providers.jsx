"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

import { AuthContextProvider } from "./AuthContext";
import RecoveryContextProvider from "./RecoveryContext";
import { GOOGLE_OAUTH_CLIENT_ID } from "../utils/googleOAuth";

function CoreProviders({ children }) {
  return (
    <AuthContextProvider>
      <RecoveryContextProvider>{children}</RecoveryContextProvider>
    </AuthContextProvider>
  );
}

/**
 * Client provider stack — mirrors the nesting in FED-Frontend/src/index.jsx:
 *
 *   AuthContextProvider > RecoveryContextProvider > GoogleOAuthProvider > App
 *
 * `BrowserRouter` is gone (the App Router replaces it). Vercel's <Analytics />
 * and <SpeedInsights /> are omitted here — they are injected by the hosting
 * platform for Next.js apps rather than mounted as components.
 */
export default function Providers({ children }) {
  if (!GOOGLE_OAUTH_CLIENT_ID) {
    return <CoreProviders>{children}</CoreProviders>;
  }

  return (
    <CoreProviders>
      <GoogleOAuthProvider clientId={GOOGLE_OAUTH_CLIENT_ID}>
        {children}
      </GoogleOAuthProvider>
    </CoreProviders>
  );
}
