# FED KIIT — 1:1 Next.js replica of FED-Frontend + FED-Backend

A pixel-for-pixel port of the React/Vite frontend and Express backend into a
single Next.js 16 App Router application.

The approach is deliberate: rather than re-approximating the design in Tailwind
(the first attempt, which drifted visibly), **the original SCSS modules were
carried over verbatim** — all 86 of them, plus every image asset. The components
keep their original markup and class names. That is what makes the replica
indistinguishable from the original rather than merely similar.

---

## Verified

Both apps were run side by side (Vite on :5173 + Express on :5000, Next on :3111)
and compared in the browser.

**Pixel parity — /Events**

| Measure | Vite original | Next replica |
|---|---|---|
| Total page height | 6109px | **6109px** |
| Page width | 1430px | **1430px** |
| `<img>` / `<button>` / `<a>` / `<p>` | 80 / 39 / 63 / 76 | **80 / 39 / 63 / 76** |
| Navbar | 1430 × 90 | **1430 × 90** |
| Event card | 352 × 313.448, `#2a2a2a`, radius 22.732px | **identical** |
| Register button | 128 × 38.520835876464844 | **identical** |
| Cover image | 350.67 × 208, radius 22.732px | **identical** |

**Pixel parity — /Team**

| Measure | Vite original | Next replica |
|---|---|---|
| Total page height | 9461px | **9461px** |
| `<img>` / `<a>` / `<p>` / headings | 64 / 27 / 63 / 72 | **64 / 27 / 63 / 72** |
| Member avatar | 180 × 180 | **180 × 180** |

**API byte-parity** — responses hashed and compared against the live Express
server, against the same MongoDB:

```
/api/form/getAllForms        IDENTICAL
/api/user/fetchTeam          IDENTICAL
/api/user/fetchAlumni        IDENTICAL
/api/blog/getBlog            IDENTICAL
/api/user/fetchAccessTypes   IDENTICAL
```

**Checks**

```
npm run typecheck    clean
npm run lint         0 errors
npm run build        54 routes
SSR audit            0 render-time / module-scope browser API access
CSS Modules audit    84 modules · 0 failed to compile · 0 impure selectors
```

The 298 lint *warnings* are all in `src/**` and are deliberate — see
"CSS Modules purity" and `eslint.config.mjs` for why the ported tree is held to
a different standard than code written for this project.

---

## URLs are identical

Routes keep the original React Router casing — `/Events`, `/Team`, `/Blog`,
`/Login`, `/SignUp`, `/PrivacyPolicy`, `/Events/:id/Form`, `/profile/...` — so
the address bar looks the same and existing links keep working. Lowercase
variants 308 to the canonical casing.

These redirects live in `proxy.ts`, not `next.config.ts`: Next matches a
redirect `source` case-insensitively, so a rule from `/Events` to `/events` also
matches `/events` and loops forever.

## Route guards — the redirect after sign-in

The original never navigated from inside `Login.jsx`. It called
`authCtx.login(...)` and let the **route table** react:

```jsx
<Route path="/Login" element={authCtx.isLoggedIn ? <LoginRedirect /> : <Login />} />
```

App Router routes are files, so nothing observes `isLoggedIn`, and `proxy.ts`
only runs on a server request — which a client-side sign-in never makes. The
first cut of this port dropped the behaviour: a correct login showed "Login
successful" and then sat on `/Login` forever.

**The redirect belongs in the components, not in a layout wrapper.** A guard in
`app/(auth)/layout.jsx` reacting to `isLoggedIn` was tried first and is wrong:
`SignUP.jsx` and `CompleteProfile.jsx` sign the user in and then navigate
themselves to `/`, and a layout guard cancels that in-flight `router.push`
before it commits. Measured on the signup flow — the push never reached
`history` at all, and a new account landed on `/profile` instead of `/`:

```
20494ms  resolve /api/auth/register
21025ms  history.replaceState(/Login?next=%2Fprofile)   <- guard won
         (no history.pushState(/) — SignUp's own push was discarded)
```

No delay fixes that reliably, because the push only commits once its RSC
payload arrives. So each component owns its own navigation, which is how the
ported source was already written: `Login.jsx`, `GoogleLogin.jsx` and
`GoogleSignup.jsx` all carry `shouldNavigate` / `navigatePath` state and an
effect that acts on it — dead code in the original precisely *because* the route
table did the job. Setting `setShouldNavigate(true)` after `authCtx.login(...)`
brings it to life. `SendOtp.jsx` already did exactly this and needed no change.

`src/utils/postAuthRedirect.js` resolves the destination the way `LoginRedirect`
did, plus the `?next=` the proxy appends. Because that value now comes off the
query string it is attacker-supplied, so anything that is not a plain internal
path is discarded — `//evil.com` included.

Verified in the browser by driving the real forms with the API stubbed at the
XHR layer:

| Flow | Start | Lands on |
|---|---|---|
| Login | `/Login` | **`/profile`** |
| Login | `/Login?next=/Events` | **`/Events`** |
| Login | `/Login?next=//example.com/phish` | **`/profile`** — origin preserved |
| Login | blocked page → login | **back to the blocked page**, `prevPage` cleared |
| Signup | `/SignUp` | **`/`** — matches the original |
| Login | stale localStorage, no cookie | **login form, one bounce, no loop** |

---

## What was ported

**All 122 components**, keeping the `.jsx` extension (tsconfig has `allowJs`
with `checkJs` off, so Next transpiles them without demanding annotations — the
markup stays faithful instead of being rewritten).

Home (Hero, About, Sponser, Feedback, Contact, Carousel, LiveEventPopup) ·
Events + PastEvent + EventCard + EventModal + EventForm + ShareModal ·
Team + TeamCard · Alumni · Blog + BlogCard + sidebars · Social · Chatbot ·
Login / SignUp / CompleteProfile / ForgotPassword / OTPInput / Google auth ·
Profile shell + Sidebar + ProfileView + EventsView + CertificatesView ·
Admin panel (ViewEvent, ViewMember, NewForm, AddEventForm, AddMemberForm,
BlogForm, Certificates forms + preview, EventStats, PreviewForm, SectionModal) ·
TeamManagement · AttendancePage · skeletons · micro-interactions.

**34 API endpoints** reproducing the Express contract exactly — same paths, same
JSON envelopes (`{ message, user, token }`, `{ success, data }`,
`{ success, message, events }`), because the ported components read those shapes
directly.

---

## Mechanical translations applied

| From (Vite/React Router) | To (Next.js) |
|---|---|
| `NavLink` / `Link` `to=` | `next/link` `href=` |
| `useNavigate()` → `navigate(x)` | `useRouter()` → `router.push(x)` |
| `useLocation().pathname` | `usePathname()` |
| `<Outlet />` | layout `children` |
| `import.meta.env.VITE_*` | `process.env.NEXT_PUBLIC_*` |
| `import img from "x.png"` → `src={img}` | `src={img.src}` |
| `BrowserRouter` in index.jsx | App Router + `src/context/Providers.jsx` |

---

## SSR compatibility — audited clean

The Vite app only ever executed in a browser; under Next these also run on the
server. The following were fixed:

- `window.scrollTo(...)` called during render (Home, Error) → moved into a mount
  effect.
- `useState(window.innerWidth)` initialisers (`useWindowWidth`, `useDimensions`,
  Contact) → start at 0 and resolve on mount, with the resize handler invoked
  once so the value is correct immediately.
- `localStorage` read in a `useState` initialiser (AuthContext,
  RecoveryContext) → restored in a mount effect.
- `new JSConfetti()` at module scope → constructed lazily; its constructor
  touches `document`.

**Verification.** `next build` only prerenders reachable routes, so components
behind auth or inside click-opened modals were never exercised — a latent
instance would have surfaced as a runtime crash for a real user. All 125
components were therefore swept with a brace-depth scanner that flags
`window` / `document` / `localStorage` / `sessionStorage` / `navigator` accessed
at module scope or directly in a component body (as opposed to inside an effect,
handler, or other closure).

Result: **zero** remaining hazards. The two genuine browser-API constructors
(`new SpeechRecognition()` in the Chatbot, `new Html5QrcodeScanner()` in
AttendancePage) were confirmed to sit inside handlers, the former behind an
`'SpeechRecognition' in window` guard.

## CSS Modules purity — audited clean

- **46 impure selectors** across 18 modules. Vite leaves element selectors alone
  in CSS Modules (only class names are hashed), so `button { }` was already
  global; Next rejects it. They are wrapped in `:global(...)`, which emits
  exactly the CSS Vite did. Keyframe selectors (`from`, `to`, `0%`) are excluded
  — wrapping those is a Sass syntax error.
- `:root { --primary }` moved out of `Global.scss` into `globals.scss`; a
  `:root` rule inside a CSS Module is an impure selector.
- Two modules used Vite's absolute `@import "/src/assets/styles/Global.scss"`,
  which Next cannot resolve → rewritten as correct relative `@use`.

**Verification.** `next build` compiles only stylesheets that something imports,
so an unreachable module could still carry a defect. All 84 modules were
compiled directly through Sass and their output parsed for top-level rules that
target no class or id.

That audit caught a real bug the build had not: the automated wrapping pass
worked line by line, so on a selector list split across lines it wrapped only
the half on the line that opened the block —

```scss
input[type="number"]::-webkit-inner-spin-button,          /* left scoped */
:global(input[type="number"]::-webkit-outer-spin-button) { /* wrapped     */
```

leaving the number-input spin-button reset silently not applying. Fixed, and
re-verified: **84 modules · 0 failed to compile · 0 impure selectors**.

## The font bug worth knowing about

The original loaded Google Fonts with `@import url(...)` inside `index.scss`.
**Those rules do not survive Next's CSS bundler** — measured at runtime, the page
had **zero** registered "Open Sans" font faces against 183 in the Vite build. All
body text silently fell back to a system sans-serif and every line box was ~2px
shorter, which compounded into visibly different card and section heights.

Fonts are now loaded from `<link>` tags in `app/layout.tsx`. After the fix the
button measures `38.520835876464844px` in both builds — exactly equal.

---

## Configuration — the port is not hardcoded

The listening port comes from the environment, with the usual precedence:

```
shell environment  >  .env.local  >  .env
```

```bash
npm run dev          # uses PORT from .env.local (currently 3111)
PORT=4000 npm start  # shell wins
```

This needs a launcher (`scripts/with-env.mjs`) rather than being read by Next
directly, for two documented reasons:

1. Next **cannot** read `PORT` from a `.env` file — "booting up the HTTP server
   happens before any other code is initialized" (Next CLI reference). Something
   has to place it in the environment first.
2. Node's own `--env-file` flag does that, but `next build` forks worker
   processes and forwards CLI flags through `NODE_OPTIONS`, which rejects it
   outright: *"--env-file-if-exists is not allowed in NODE_OPTIONS"*. Verified —
   `dev` and `start` worked, `build` failed.

The launcher parses the env files itself and spawns `next` as a child process
with an explicit environment, so the flag never reaches `NODE_OPTIONS` and all
three commands behave identically. Every other variable is still loaded by Next
as normal; this only exists so `PORT` is available early enough.

## Endpoint coverage

All 48 Express endpoints are implemented. The later additions:

- **Team invites / join requests** — `inviteTeamMember`, `inviteLink/:formId`,
  `sendJoinRequest`, `joinRequestUpdates/:formId`, `allJoinRequestUpdates`,
  `respondJoinRequest`, alongside create / join / leave / rename / remove /
  search.
- **Attendance** — `markAttendance`, `attendanceCode/:id`,
  `export-attendance/:id`, `download/:id`.
- **Certificates** — `verifyCertificate`, `addCertificateTemplate`,
  `dummyCertificate`, `sendCertificatesAndEvents`, `testCertificateSending`.
- **Gemini helpers** — `gemini/autofill`, `gemini/summary`.
- **Profile image upload** — `user/editProfileImage`.
- **Chatbot email** — `chatbot/send-email`.

Two deliberate implementation differences:

- **Spreadsheets are CSV, not `.xlsx`.** The original streamed real workbooks via
  ExcelJS. CSV opens identically in Excel and Sheets and keeps a spreadsheet
  writer out of the bundle.
- **Certificate images are composited client-side.** The original used `canvas`
  and `puppeteer` server-side; neither deploys cleanly to a serverless runtime
  (`puppeteer` alone downloads a full Chromium). The template URL and field
  coordinates are returned instead — which is what the admin preview already
  does with html2canvas.

## Security fixes

`npm audit` went from **44 vulnerabilities (1 critical, 41 high) to 0**:

| Package | Action |
|---|---|
| `xlsx` | 0.18.5 from npm → **0.20.3 from the official SheetJS distribution**, which patches the prototype-pollution CVE. The npm package is stale; SheetJS moved distribution to their own registry |
| `react-share-social` | **Removed** — unmaintained, predates React 19, and bundled a legacy jest toolchain responsible for ~20 high advisories. Replaced with a local `ShareSocial` built on `react-share`, taking the same props so ShareModal only changed its import. Dropped 530 packages |
| `postcss`, `sharp` | Pinned to patched versions via npm `overrides`. npm's suggested fix for both was `next@9.3.3` — a downgrade to Next 9 — which is not a fix |
| `react-quill-new` | **Removed** — never imported, by the port or the original |

Two further problems surfaced while verifying, both inherited from the original
`.env` and both caught by the env schema in `lib/env.ts`:

- **`JWT_SECRET` was 4 characters.** A 4-character HMAC secret is brute-forceable
  in seconds, which means anyone could forge a session token for any account,
  including admins. Replaced with 64 bytes of CSPRNG entropy. **This rotates
  sessions** — everyone signs in once more. If you need session continuity for a
  phased cutover, set the old value back temporarily, but do not ship it.
- **`BCRYPT_SALT_ROUNDS` held a bcrypt salt string, not a cost factor.** The
  original frontend ran `parseInt()` over `$2b$10$Q0RPeouq…`, which yields `NaN`.
  Set to `10`, the cost embedded in that salt.

`POST /api/form/contact` also now validates the email format, length and message
length. The Express controller checked only for presence, so `email: "bad"` was
accepted and wrote unreplyable rows into `contactus`.

## Auth routes — verified

Every auth route was exercised against the running server, signed out and
signed in. `proxy.ts` is the gate; the numbers below are what it returned.

| Route | Signed out | Signed in |
|---|---|---|
| `/Login` `/SignUp` `/ForgotPassword` `/completeProfile` `/otp` | 200 | **307 → `/profile`** |
| `/profile` and all six sub-pages | **307 → `/Login?next=…`** | 200 |
| `/login` `/signup` `/forgotpassword` `/completeprofile` | 308 → canonical casing | — |

A forged or expired token is treated as no token, and the bad cookie is cleared
on the way out:

```
GET /profile   Cookie: token=<tampered>
307 → /Login?next=%2Fprofile
set-cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

The seven auth endpoints reject malformed input rather than failing open —
`login`, `register`, `verifyEmail`, `forgotPassword` and `googleAuth` all
answer 400 on an empty body, and `logout` is idempotent. `changePassword` is
the reset step and is gated on a single-use OTP, rate limited, and returns the
same message whether or not the account exists.

## Known issues

- **`/ForgotPassword` reloads instead of submitting.** Its `<form>` has no
  `onSubmit` and `Button` renders an untyped `<button>`, so "Send OTP" submits
  natively and the page navigates to `?email=…` before the 1.5s handler can run.
  Reproduced identically in the original — inherited, not a port defect. Left
  alone because fixing it changes behaviour rather than restoring it.
- **`/profile/members` and `/profile/BlogForm` are not access-gated in the UI.**
  App.jsx only registered those routes for `ADMIN` (and `SENIOR_EXECUTIVE_CREATIVE`
  for the blog form), so a non-admin hitting the URL fell through to the error
  page; here they render for any signed-in user. Every mutation behind them is
  still enforced server-side — `createBlog` checks `canManageBlogs`, `addMember`
  and `editDetails` return 403 — so the exposure is the admin screen itself, not
  the ability to use it. The data it lists comes from `fetchTeam`, which is
  public either way (see below).
- `/api/user/fetchTeam` returns members' email addresses to anonymous callers.
  Preserved deliberately: trimming the projection changes the response bytes and
  the Team page's sort order. Worth fixing, but it is a behaviour change, not a
  port defect.
