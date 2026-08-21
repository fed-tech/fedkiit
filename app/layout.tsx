import type { Metadata, Viewport } from "next";
import Script from "next/script";

import Providers from "@/src/context/Providers";
import Chatbot from "@/src/components/Chatbot/Chatbot";
import ToastProvider from "@/src/components/ToastProvider/ToastProvider";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE } from "@/lib/site";
import { SITE_URL } from "@/lib/seo/metadata";
import { organizationSchema, websiteSchema } from "@/lib/seo/structured-data";

import "./globals.scss";
// Design tokens and `fed-*` component classes for the revamped Navbar and Home
// sections. Loaded after globals.scss so its :root tokens win.
import "./globals.css";

/**
 * Root layout.
 *
 * Fonts are loaded through the `@import url(...)` rules in globals.scss exactly
 * as the Vite app did, rather than `next/font`. `next/font` self-hosts and
 * subsets the files, which shifts glyph metrics slightly — visible as different
 * line wrapping against the original.
 *
 * Head metadata is expanded from the original index.html (same title,
 * description, keywords and the Facebook domain verification token).
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FED KIIT",
    template: "%s | FED KIIT",
  },
  description: SITE.description,
  keywords: [...SITE.keywords],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE.name,
    title: "FED KIIT",
    description: SITE.description,
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: "FED KIIT",
    description: SITE.description,
  },
  // No `icons` entry on purpose. Setting one overrides Next's file convention
  // wholesale, and this used to pin the icon to /favicon.ico — which was still
  // the Vercel triangle that `create-next-app` ships, so the scaffolding icon
  // was being served in place of the FED logo. Leaving it out lets app/
  // favicon.ico, icon.png and apple-icon.png all get advertised.
  other: {
    "facebook-domain-verification": "j4kyebnva8sowmo539jn3julvtgvqq",
  },
};

export const viewport: Viewport = {
  themeColor: "#1c1c1c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `data-scroll-behavior="smooth"` acknowledges the `scroll-behavior: smooth`
    // that globals.scss sets on <html>. Without it Next warns, because it has to
    // decide whether a route change should animate the scroll to the top — with
    // the attribute present it keeps the smooth scroll the original had.
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/*
          The exact font families and weights the original SCSS pulled in.
          Declared as <link> rather than `@import url(...)` in globals.scss:
          Next's CSS bundler drops those rules, which left Open Sans unloaded and
          every line box ~2px shorter than the Vite build.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&family=Poppins:wght@300;400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&family=Oswald:wght@400;500;600;700&family=Mulish:wght@400;500;600;700&family=Pixelify+Sans:wght@400;500;600;700&family=Rubik:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <JsonLd schema={[organizationSchema(), websiteSchema()]} />
        <Providers>
          {/*
            App.jsx renders <Chatbot /> above <Routes>, so it is present on
            every route — the auth screens included. Mounting it in the (main)
            layout instead hid it on /Login, /SignUp, /otp, /ForgotPassword and
            /completeProfile. It sits inside Providers because it reads
            AuthContext to attach the signed-in user to a conversation.
          */}
          <Chatbot />
          <ToastProvider />
          {children}
        </Providers>

        {/* Razorpay checkout, loaded in index.html on the original site. */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
        {/* Google Analytics, same measurement id as the original. */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-027MLWYPTL"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-027MLWYPTL');`}
        </Script>
      </body>
    </html>
  );
}
