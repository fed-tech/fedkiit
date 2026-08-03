/**
 * Where to send someone straight after they sign in.
 *
 * Reproduces `LoginRedirect` from FED-Frontend/src/App.jsx:
 *
 *   const redirectTo = sessionStorage.getItem("prevPage") || "/profile";
 *   sessionStorage.removeItem("prevPage");
 *   return <Navigate to={redirectTo} replace />;
 *
 * `?next=` is new: `proxy.ts` appends it when it turns an anonymous request for
 * a protected route away, which is the server-side equivalent of the
 * `prevPage` that the original's `ProtectedRoute` stashed. Both mean the same
 * thing — the page the visitor was actually trying to reach — so either is
 * accepted, the proxy's first because it is the more recent intent.
 *
 * The return path is read from the URL, so unlike the original it is
 * attacker-supplied: anything that is not a plain internal path is discarded,
 * the same rule `proxy.ts` applies to the value on its way out.
 */

const isSafeInternalPath = (path) =>
  typeof path === "string" && path.startsWith("/") && !path.startsWith("//");

export default function postAuthRedirect() {
  if (typeof window === "undefined") return "/profile";

  const next = new URLSearchParams(window.location.search).get("next");
  const prevPage = sessionStorage.getItem("prevPage");
  sessionStorage.removeItem("prevPage");

  if (isSafeInternalPath(next)) return next;
  if (isSafeInternalPath(prevPage)) return prevPage;
  return "/profile";
}
