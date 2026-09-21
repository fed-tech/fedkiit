"use client";

import { useRef, useCallback } from "react";
import "./ProfileCard.css";

/**
 * ProfileCard — React Bits inspired component.
 *
 * Designed for standard rectangular JPEG/PNG member photos (Cloudinary URLs).
 * The avatar fills the card top-half with object-fit:cover and renders in full
 * original colours (no mix-blend-mode luminosity).
 *
 * Props
 * ─────
 * name            string   – displayed name
 * title           string   – role / year / school line
 * handle          string   – @handle or roll number
 * status          string   – e.g. "Active" (shows green dot)
 * avatarUrl       string   – full-size Cloudinary profile URL
 * miniAvatarUrl   string   – thumbnail URL (same as avatarUrl is fine)
 * behindGlowEnabled boolean – renders ambient glow behind card
 * enableTilt      boolean  – 3-D tilt on mouse-move
 */
const ProfileCard = ({
  name = "",
  title = "",
  handle = "",
  status = "Active",
  avatarUrl = "",
  miniAvatarUrl = "",
  behindGlowEnabled = true,
  enableTilt = true,
}) => {
  const cardRef = useRef(null);
  const shineRef = useRef(null);

  // Derive initials from name for the fallback avatar
  const initials = name
    ? name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
    : "?";

  // ── Mouse tracking for tilt + shine ──────────────────────
  const handleMouseMove = useCallback(
    (e) => {
      if (!cardRef.current) return;
      const card = cardRef.current;
      const rect = card.getBoundingClientRect();

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;

      // Mouse position as % inside the card (for the shine gradient)
      const pctX = ((e.clientX - rect.left) / rect.width) * 100;
      const pctY = ((e.clientY - rect.top) / rect.height) * 100;

      if (shineRef.current) {
        shineRef.current.style.setProperty("--mouse-x", `${pctX}%`);
        shineRef.current.style.setProperty("--mouse-y", `${pctY}%`);
      }

      if (enableTilt) {
        const maxTilt = 14;
        const rotX = (-dy / (rect.height / 2)) * maxTilt;
        const rotY = (dx / (rect.width / 2)) * maxTilt;
        card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.03, 1.03, 1.03)`;
      }
    },
    [enableTilt]
  );

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.transform =
      "rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    cardRef.current.style.transition =
      "transform 0.55s cubic-bezier(0.23, 1, 0.32, 1)";
    setTimeout(() => {
      if (cardRef.current) cardRef.current.style.transition = "";
    }, 560);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.transition = "transform 0.1s linear";
    }
  }, []);

  return (
    <div className="pc-card-wrapper">
      {/* Ambient glow rendered BEHIND the card */}
      {behindGlowEnabled && <div className="pc-behind-glow" />}

      <div
        ref={cardRef}
        className="pc-card"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        aria-label={`Profile card for ${name}`}
      >
        {/* Mouse-tracking shine layer */}
        <div ref={shineRef} className="pc-shine" />

        {/* ── Avatar (top ~58% of card) ── */}
        <div className="pc-avatar-content">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name || "Profile photo"}
              className="avatar"
              draggable={false}
            />
          ) : (
            <div className="pc-avatar-fallback" aria-hidden="true">
              {initials}
            </div>
          )}
        </div>

        {/* ── Bottom info bar ── */}
        <div className="pc-info">
          <div className="pc-name-row">
            {/* Mini circular avatar */}
            {miniAvatarUrl ? (
              <img
                src={miniAvatarUrl}
                alt=""
                className="pc-mini-avatar"
                draggable={false}
                aria-hidden="true"
              />
            ) : (
              <div className="pc-mini-avatar-fallback" aria-hidden="true">
                {initials}
              </div>
            )}

            <div>
              <p className="pc-name">{name || "FED Member"}</p>
              {title && <p className="pc-title">{title}</p>}
            </div>
          </div>

          <div className="pc-handle-row">
            {handle && (
              <span className="pc-handle">@{handle}</span>
            )}
            {status && (
              <span className="pc-status">
                <span className="pc-status-dot" />
                {status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
