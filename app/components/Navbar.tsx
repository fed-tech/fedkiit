"use client";

import { useState, useEffect, useRef, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MdOutlineLogout, MdChevronRight } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";

import AuthContext from "@/src/context/AuthContext";
import defaultImg from "@/src/assets/images/defaultImg.jpg";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/Events", label: "Events" },
  { href: "/Team", label: "Team" },
  { href: "/Insights", label: "Insights" },
];

export default function Navbar() {
  const pathname = usePathname();
  const authCtx = useContext(AuthContext);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  // Refs, not state: the previous scroll position changes on every tick and
  // nothing renders from it, so holding it in state forced a re-render per
  // scroll event — and, because the effect listed it as a dependency, tore the
  // listener down and re-attached it just as often. That is what made the bar
  // stutter. `mobileOpenRef` lets the handler read the latest value without
  // becoming a dependency itself.
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const mobileOpenRef = useRef(mobileOpen);
  // Synced in an effect rather than assigned during render, which React's lint
  // rules reject — refs must not be written while rendering.
  useEffect(() => {
    mobileOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  const checkIsActive = (linkHref: string) => {
    if (!pathname) return false;
    if (linkHref === "/") {
      return pathname === "/";
    }
    const cleanPath = pathname.toLowerCase();
    const cleanHref = linkHref.toLowerCase();

    if (cleanHref === "/blog" && (cleanPath.startsWith("/blog") || cleanPath.startsWith("/social") || cleanPath.startsWith("/insights"))) {
      return true;
    }
    return cleanPath === cleanHref || cleanPath.startsWith(`${cleanHref}/`) || cleanPath.startsWith(cleanHref);
  };

  useEffect(() => {
    // Work is done once per animation frame rather than once per scroll event.
    // Browsers fire scroll far more often than they paint, so without this the
    // component did several times more state work than the screen could show.
    const update = () => {
      ticking.current = false;
      const currentScrollY = window.scrollY;

      // Elongate the bar once past 40px.
      setScrolled(currentScrollY > 40);

      if (!mobileOpenRef.current) {
        if (currentScrollY <= 220) {
          // Always visible near the top, so the elongation is legible.
          setVisible(true);
        } else if (currentScrollY > lastScrollY.current + 6) {
          setVisible(false);
        } else if (currentScrollY < lastScrollY.current - 6) {
          setVisible(true);
        }
      }

      // Only advance the reference point once the threshold has been crossed.
      // Updating it every frame meant a slow drag never accumulated past the
      // threshold, so the bar hunted between shown and hidden.
      if (Math.abs(currentScrollY - lastScrollY.current) > 6) {
        lastScrollY.current = currentScrollY;
      }
    };

    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", handleScroll);
    // Attached once for the lifetime of the component.
  }, []);

  // Close the mobile menu on route change.
  //
  // Adjusted during render rather than in an effect: setting state
  // synchronously inside an effect triggers a second render pass, which the
  // project's lint config rejects as an error. This is React's documented
  // pattern for resetting state when a prop changes.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
    setVisible(true);
  }

  return (
    <>
      {/* Dynamic Backdrop Blur Overlay (Mobile) */}
      <div
        className={`fed-mobile-backdrop ${mobileOpen ? "fed-mobile-backdrop--open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <header className={`fed-navbar-wrapper ${!visible ? "fed-navbar-wrapper--hidden" : ""}`}>
        <nav
          className={`fed-navbar ${scrolled ? "fed-navbar--scrolled" : ""} ${mobileOpen ? "fed-navbar--dynamic-island" : ""
            }`}
        >
          {/* Top Navbar Row */}
          <div className="fed-navbar-row">
            {/* Brand Logo */}
            <Link href="/" className="fed-brand-link" aria-label="FED KIIT Home">
              <div className="fed-logo-badge">
                <Image
                  src="/fedkiit-logo.png"
                  alt="FED KIIT Logo"
                  width={40}
                  height={40}
                  className="fed-logo-img"
                  priority
                />
              </div>
              <span className="fed-logo-text">FED KIIT</span>
            </Link>

            {/* Desktop Nav Links Pill Container */}
            <div className="fed-nav-pill-container">
              {navLinks.map((link) => {
                const isActive = checkIsActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`fed-nav-link ${isActive ? "fed-nav-link--active" : ""}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Desktop Right Action */}
            <div className="fed-desktop-action">
              {/* While the session is still being restored `isLoading` is true
                  on both the server and the first client render, so showing the
                  signed-out state here keeps hydration consistent and avoids a
                  flash of the wrong control. */}
              {!authCtx.isLoading && authCtx.isLoggedIn ? (
                <Link
                  href="/profile"
                  className="fed-avatar-link"
                  aria-label="Your profile"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={authCtx.user.img || defaultImg.src}
                    alt="Profile"
                    className="fed-avatar"
                  />
                </Link>
              ) : (
                <Link href="/Login" className="fed-btn-orange">
                  Login
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="fed-mobile-toggle">
              <button
                className="hamburger-button"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle mobile navigation menu"
              >
                <div className={`hamburger ${mobileOpen ? "open" : ""}`}>
                  <span />
                  <span />
                  <span />
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Island Expandable Content (Mobile Only) */}
          <AnimatePresence initial={false}>
            {mobileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: "auto",
                  opacity: 1,
                  transition: {
                    height: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                    opacity: { duration: 0.28, ease: "easeOut" }
                  }
                }}
                exit={{
                  height: 0,
                  opacity: 0,
                  transition: {
                    height: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                    opacity: { duration: 0.2, ease: "easeIn" }
                  }
                }}
                className="fed-mobile-menu-container"
                style={{ overflow: "hidden" }}
              >
                <div className="fed-mobile-menu-list">
                  {navLinks.map((link) => {
                    const isActive = checkIsActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`clay-nav-item ${isActive ? "clay-nav-item--active" : ""}`}
                        onClick={() => setMobileOpen(false)}
                      >
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}

                  <div className="fed-mobile-login-wrapper">
                    {!authCtx.isLoading && authCtx.isLoggedIn ? (
                      <>
                        <Link
                          href="/profile"
                          className={`clay-nav-item ${checkIsActive("/profile") ? "clay-nav-item--active" : ""}`}
                          onClick={() => setMobileOpen(false)}
                          style={{ marginBottom: "0.5rem" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={authCtx.user.img || defaultImg.src}
                              alt=""
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                              }}
                            />
                            <span>{authCtx.user.name || "Profile"}</span>
                          </div>
                          <MdChevronRight size={22} style={{ opacity: 0.8 }} />
                        </Link>
                        <button
                          type="button"
                          className="fed-btn-orange fed-btn-orange--full"
                          onClick={() => {
                            setMobileOpen(false);
                            authCtx.logout();
                          }}
                        >
                          Logout <MdOutlineLogout size={18} />
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/Login"
                        className="fed-btn-orange fed-btn-orange--full"
                        onClick={() => setMobileOpen(false)}
                      >
                        Login →
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </header>
    </>
  );
}
