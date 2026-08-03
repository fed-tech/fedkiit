/**
 * Auth layout — the `AuthLayout` component from App.jsx.
 * No navbar, no footer, just the `.authpage` wrapper.
 *
 * App.jsx also guarded these five routes with
 * `authCtx.isLoggedIn ? <Navigate /> : <Page />`. That is deliberately *not*
 * reproduced as a wrapper here. Two of the pages sign the user in and then
 * navigate themselves (SignUp and CompleteProfile both go to "/"), and a
 * layout-level guard reacting to `isLoggedIn` cancels their in-flight
 * `router.push` before it commits — measured: the push never reached
 * `history`. The redirect therefore lives in each component that needs it,
 * using the `shouldNavigate` state they already carried, and `proxy.ts` covers
 * a signed-in visitor arriving at one of these URLs.
 *
 * No Suspense boundary here: wrapping children made prerendered pages emit
 * their markup twice (once inside the streamed boundary, once outside). Pages
 * that read search params declare their own boundary.
 */
export default function AuthLayout({ children }) {
  return <div className="authpage">{children}</div>;
}
