"use client";

import React, { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import style from "./styles/EventCard.module.scss";

import Share from "../../features/Modals/Event/ShareModal/ShareModal";
import QRCodeModal from "../../features/Modals/Event/QRCodeModal";
import { PiClockCountdownDuotone } from "react-icons/pi";
import { IoIosLock } from "react-icons/io";
import { QrCode, Share2, BarChart3 } from "lucide-react";
import { parse, differenceInMilliseconds } from "date-fns";
import AuthContext from "../../context/AuthContext";
import { Blurhash } from "react-blurhash";
import { Alert, MicroLoading } from "../../microInteraction";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isPrerequisiteMet } from "../../utils/prerequisite";
import {
  batchRegistrationErrorMessage,
  isBatchRegistrationBlocked,
  isCurrentBatchEmail,
  stripMarkdownForPreview,
} from "../../utils/batchRestriction";
import { cdn } from "../../utils/cloudinary";

export function EventCardSkeleton({ variant = "default" }) {
  const featured = variant === "featured";

  return (
    <div
      className={`${style.skeleton} ${featured ? style.skeletonFeatured : ""}`}
      aria-hidden="true"
    >
      <div className={style.skeletonMedia}>
        <span className={style.skeletonBadge} />
      </div>
      <div className={style.skeletonMain}>
        <div className={style.skeletonBody}>
          <span className={`${style.skeletonLine} ${style.skeletonMeta}`} />
          <span className={`${style.skeletonLine} ${style.skeletonTitle}`} />
          <span className={style.skeletonLine} style={{ width: featured ? "82%" : "68%" }} />
          <span className={style.skeletonLine} style={{ width: featured ? "64%" : "52%" }} />
        </div>
        <div className={style.skeletonFooter}>
          <span className={style.skeletonCta} />
          <span className={style.skeletonTool} />
        </div>
      </div>
    </div>
  );
}

const EventCard = (props) => {
  const {
    data,
    onOpen,
    type,
    showShareButton = true,
    showRegisterButton = true,
    additionalContent,
    onEdit,
    onDelete,
    enableEdit,
    isLoading,
    eventName,
    variant = "default",
  } = props;

  const { info } = data;
  const authCtx = useContext(AuthContext);
  const [isOpen, setOpen] = useState(false);
  const [isQRModalOpen, setQRModalOpen] = useState(false);
  const [remainingTime, setRemainingTime] = useState("");
  const [btnTxt, setBtnTxt] = useState("Register Now");
  const router = useRouter();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isMicroLoading, setIsMicroLoading] = useState(false);
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [navigatePath, setNavigatePath] = useState("/");
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (shouldNavigate) {
      router.push(navigatePath);
      setShouldNavigate(false); // Reset state after navigation
    }
  }, [shouldNavigate, navigatePath, router]);

  useEffect(() => {
    if (alert) {
      const { type, message, position, duration } = alert;
      Alert({ type, message, position, duration });
      setAlert(null); // Reset alert after displaying it
    }
  }, [alert]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeleton(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (info.regDateAndTime) {
      calculateRemainingTime();
      const intervalId = setInterval(calculateRemainingTime, 1000);
      return () => clearInterval(intervalId);
    }
  }, [info.regDateAndTime]);

  const date = new Date(info.eventDate);
  const day = date.getDate();

  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return "th"; // Handles 4-20
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  // Per-event, not per-page: this card's own prerequisite against this
  // visitor's own registrations.
  const prerequisiteMet = isPrerequisiteMet(info, authCtx.user?.regForm);

  const dayWithSuffix = day + getOrdinalSuffix(day);
  const month = date.toLocaleDateString("en-GB", { month: "long" });
  const year = date.getFullYear();

  const formattedDate = `${dayWithSuffix} ${month} ${year}`;

  const calculateRemainingTime = () => {
    // Parse the regDateAndTime received from backend
    const regStartDate = parse(
      info.regDateAndTime,
      "MMMM do yyyy, h:mm:ss a",
      new Date()
    );
    const now = new Date();

    const timeDifference = differenceInMilliseconds(regStartDate, now);

    if (timeDifference <= 0) {
      setRemainingTime(null);
      return;
    }

    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeDifference / (1000 * 60)) % 60);
    const seconds = Math.floor((timeDifference / 1000) % 60);

    let remaining;

    if (days > 0) {
      remaining = `${days} day${days > 1 ? "s" : ""} left`;
    } else {
      remaining = [
        hours > 0 ? `${hours}h ` : "",
        minutes > 0 ? `${minutes}m ` : "",
        seconds > 0 ? `${seconds}s` : "",
      ]
        .join("")
        .trim();
    }

    setRemainingTime(remaining);
  };

  useEffect(() => {
    calculateRemainingTime(); // Initial calculation
    const intervalId = setInterval(calculateRemainingTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  /**
   * The single owner of the button label.
   *
   * This was two effects that both wrote `btnTxt`: one for the impersonal
   * states (Closed / countdown / Register Now) and one for the personalised
   * ones (Already Registered / Locked). The personalised effect bailed out with
   * a bare `return` when signed out, so logging out left "Already Registered"
   * on screen — it re-ran, wrote nothing, and the other effect only re-runs
   * when the countdown or the closed flag changes, which logging out does not
   * do. Deriving the whole label in one place means every input, including
   * signing out, always produces a complete answer.
   */
  useEffect(() => {
    const openState = () => {
      if (remainingTime) return remainingTime;
      if (info.isRegistrationClosed) return "Closed";
      return "Register Now";
    };

    // Signed out — or still restoring the session — shows nobody's personal
    // state.
    if (!authCtx.isLoggedIn) {
      setBtnTxt(openState());
      return;
    }

    if ((authCtx.user.regForm || []).includes(data.id)) {
      setBtnTxt("Already Registered");
      return;
    }

    // Locked until this event's own prerequisite is met. Admins are exempt so
    // they can still open a gated form to check it.
    if (!prerequisiteMet && authCtx.user.access === "USER") {
      setBtnTxt(info.isRegistrationClosed ? "Closed" : "Locked");
      return;
    }

    if (isBatchRegistrationBlocked(authCtx.user.email)) {
      setBtnTxt(info.isRegistrationClosed ? "Closed" : "Not Eligible");
      return;
    }

    setBtnTxt(openState());
  }, [
    authCtx.isLoggedIn,
    authCtx.user.regForm,
    authCtx.user.access,
    data,
    info.isRegistrationClosed,
    prerequisiteMet,
    remainingTime,
  ]);

  const handleShare = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setOpen(true);
  };

  const handleQRCode = () => {
    if (
      authCtx.isLoggedIn &&
      authCtx.user.regForm &&
      authCtx.user.regForm.includes(data.id)
    ) {
      if (isCurrentBatchEmail(authCtx.user.email)) {
        setAlert({
          type: "info",
          message:
            "Attendance QR codes are not available for your batch. Please contact fedkiit@gmail.com if you need help.",
          position: "bottom-right",
          duration: 4000,
        });
        return;
      }
      setQRModalOpen(!isQRModalOpen);
    } else if (!authCtx.isLoggedIn) {
      setAlert({
        type: "info",
        message: "Please login to access attendance QR code.",
        position: "bottom-right",
        duration: 3000,
      });
    } else {
      setAlert({
        type: "info",
        message:
          "You need to register for this event first to get the attendance QR code.",
        position: "bottom-right",
        duration: 3000,
      });
    }
  };

  const handleCloseQRModal = () => {
    setQRModalOpen(false);
  };

  const isValiedState = () => {
    if (
      btnTxt === "Closed" ||
      btnTxt === "Already Registered" ||
      btnTxt === "Already Member" ||
      btnTxt === `${remainingTime}`
    ) {
      return false;
    }
    if (
      btnTxt === "Locked" &&
      authCtx.isLoggedIn &&
      authCtx.user.access === "USER"
    ) {
      setAlert({
        type: "info",
        message: `You need to register for ${eventName || "the required event"} first`,
        position: "bottom-right",
        duration: 3000,
      });
      return false;
    }
    if (btnTxt === "Not Eligible") {
      setAlert({
        type: "info",
        message: batchRegistrationErrorMessage(),
        position: "bottom-right",
        duration: 4000,
      });
      return false;
    }
    return true;
  };

  const handleForm = () => {
    // "Already Registered" on a team event is the one non-registering action the
    // primary button performs, so it is handled before the validity gate that
    // deliberately rejects that state.
    if (btnTxt === "Already Registered" && info.participationType === "Team") {
      router.push(`/Events/${data.id}/team`);
      return null;
    }

    if (!isValiedState()) {
      return null;
    }

    if (authCtx.isLoggedIn) {
      setIsMicroLoading(true);
      if (authCtx.user.access !== "USER" && authCtx.user.access !== "ADMIN") {
        setTimeout(() => {
          setIsMicroLoading(false);
          setBtnTxt("Already Member");
        }, 1500);
        setAlert({
          type: "info",
          message: "Team Members are not allowed to register for the Event",
          position: "bottom-right",
          duration: 3000,
        });
      } else {
        setNavigatePath("/Events/" + data.id + "/Form");
        setTimeout(() => {
          setShouldNavigate(true);
        }, 1000);

        setTimeout(() => {
          setIsMicroLoading(false);
        }, 3000);
      }
    } else {
      setIsMicroLoading(true);
      sessionStorage.setItem("prevPage", window.location.pathname);
      setNavigatePath("/login");

      setTimeout(() => {
        setShouldNavigate(true);
      }, 1000);

      setTimeout(() => {
        setIsMicroLoading(false);
      }, 3000);
    }
  };

  // Every event -- upcoming, past, or viewed from the admin panel -- is served
  // by the single /Events/[eventId] route, so the card builds its own link
  // rather than trusting the caller.
  //
  // This used to be `modalpath + data.id`, from when `modalpath` named a modal
  // and was never navigated to. Turning the title into a real <Link> made those
  // strings live URLs, and three of the four callers were passing paths that
  // have no route: "/pastEvents/", "/Events/pastEvents/" and "/profile/Events/".
  // Every past-event card on the site 404'd as a result.
  const detailsHref = `/Events/${data.id}`;
  // Built from the origin, not from the current href - appending the id to
  // whatever page you happen to be on produced links like /Events/x/y.
  const shareUrl =
    typeof window === "undefined"
      ? detailsHref
      : new URL(detailsHref, window.location.origin).toString();
  const isPast = type === "past";
  const isRegistered =
    authCtx.isLoggedIn &&
    authCtx.user.regForm &&
    authCtx.user.regForm.includes(data.id);

  const isUpcoming =
    !isPast && new Date(info.eventDate).getTime() >= Date.now();

  // Featured cards that are still ahead of us get an "Upcoming" badge so the
  // spotlight is unambiguous - the green "Open" only answers "can I register".
  const status =
    variant === "featured" && isUpcoming
      ? { label: "Upcoming", tone: "soon" }
      : isPast
        ? { label: "Completed", tone: "neutral" }
        : info.isRegistrationClosed
          ? { label: "Registration closed", tone: "closed" }
          : remainingTime
            ? { label: "Opening soon", tone: "soon" }
            : { label: "Open", tone: "open" };

  // The primary action is inert in these states, but stays focusable so the
  // reason for it (an alert, or nothing at all) is still reachable by keyboard.
  const isCtaInert =
    btnTxt === "Closed" ||
    btnTxt === "Already Member" ||
    btnTxt === "Not Eligible" ||
    (btnTxt === "Already Registered" && info.participationType !== "Team");

  const ctaContent = () => {
    if (btnTxt === "Closed") {
      return (
        <>
          <IoIosLock aria-hidden="true" />
          Closed
        </>
      );
    }
    if (btnTxt === "Already Registered") {
      return info.participationType === "Team" ? "Team details" : "Registered";
    }
    if (btnTxt === "Locked") {
      return (
        <>
          <IoIosLock aria-hidden="true" />
          Locked
        </>
      );
    }
    if (btnTxt === "Not Eligible") {
      return (
        <>
          <IoIosLock aria-hidden="true" />
          Not eligible
        </>
      );
    }
    if (isMicroLoading) {
      return <MicroLoading />;
    }
    if (remainingTime) {
      return (
        <>
          <PiClockCountdownDuotone aria-hidden="true" />
          {btnTxt}
        </>
      );
    }
    if (btnTxt === "Already Member") {
      return "Already member";
    }
    return "Register now";
  };

  if (isLoading || showSkeleton) {
    return <EventCardSkeleton variant={variant} />;
  }

  return (
    <article
      className={`${style.card} ${variant === "featured" ? style.featured : ""}`}
    >
      {variant === "featured" && (
        <div className={style.techPattern} aria-hidden="true">
         <svg
  className={style.techSvg}
  viewBox="0 0 320 400"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  preserveAspectRatio="xMaxYMid slice"
>
  {/* Background Grid */}
  <g stroke="currentColor" strokeWidth="0.6" opacity="0.05">
    {Array.from({ length: 8 }).map((_, i) => (
      <line
        key={`v-${i}`}
        x1={50 + i * 35}
        y1="0"
        x2={50 + i * 35}
        y2="400"
      />
    ))}

    {Array.from({ length: 10 }).map((_, i) => (
      <line
        key={`h-${i}`}
        x1="0"
        y1={25 + i * 38}
        x2="320"
        y2={25 + i * 38}
      />
    ))}
  </g>

  {/* Main Network */}
  <g
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    opacity="0.25"
    fill="none"
  >
    <path d="M310 40L240 85L270 145L200 185L240 255L170 310L210 365" />
    <path d="M240 85L180 55L130 120L200 185" />
    <path d="M270 145L310 205L240 255" />
    <path d="M170 310L100 275L80 340" />
  </g>

  {/* Nodes */}
  <g fill="currentColor" opacity="0.55">
    <circle cx="310" cy="40" r="2.5" />
    <circle cx="240" cy="85" r="3" />
    <circle cx="180" cy="55" r="2" />
    <circle cx="130" cy="120" r="2.5" />
    <circle cx="270" cy="145" r="3" />
    <circle cx="200" cy="185" r="3.5" />
    <circle cx="310" cy="205" r="2.5" />
    <circle cx="240" cy="255" r="3" />
    <circle cx="170" cy="310" r="3" />
    <circle cx="100" cy="275" r="2.5" />
    <circle cx="80" cy="340" r="2" />
    <circle cx="210" cy="365" r="2.5" />
  </g>

  {/* Soft Rings */}
  <g stroke="currentColor" strokeWidth="1" opacity="0.08" fill="none">
    <circle cx="245" cy="85" r="22" />
    <circle cx="200" cy="185" r="34" />
    <circle cx="170" cy="310" r="26" />
  </g>

  {/* Tiny Accent Squares */}
  <g fill="currentColor" opacity="0.18">
    <rect x="205" y="58" width="4" height="4" rx="1" />
    <rect x="282" y="176" width="4" height="4" rx="1" />
    <rect x="115" y="245" width="4" height="4" rx="1" />
  </g>

  {/* Vertical Accent */}
  <line
    x1="296"
    y1="30"
    x2="296"
    y2="370"
    stroke="currentColor"
    strokeWidth="1"
    opacity="0.18"
    strokeDasharray="3 9"
  />
</svg>
        </div>
      )}

      {/* Presentational: the stretched title link below covers this area, so a
          second focusable link here would only duplicate the tab stop. */}
      <div className={style.media}>
        {!imageLoaded && (
          <div className={style.mediaPlaceholder}>
            <Blurhash
              hash="LEG8_%els7NgM{M{RiNI*0IVog%L"
              width="100%"
              height="100%"
              resolutionX={32}
              resolutionY={32}
              punch={1}
            />
          </div>
        )}
        {/* Cropped from the bottom rather than the centre — see `.image` in the
            stylesheet for why. */}
        <img
          src={cdn(info.eventImg, variant === "featured" ? 1000 : 700)}
          className={style.image}
          style={{ opacity: imageLoaded ? 1 : 0 }}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
        />
        <span className={style.badge} data-tone={status.tone}>
          {status.label}
        </span>
      </div>

      <div className={style.body}>
        {/* Date, format and price read as one scannable line rather than three
            separate chips - the card only needs one row of metadata. */}
        <p className={style.meta}>
          <span>{formattedDate}</span>
          {!isPast && (
            <>
              <span className={style.metaDot} aria-hidden="true" />
              <span>
                {info.participationType === "Team"
                  ? `Team of ${info.minTeamSize}\u2013${info.maxTeamSize}`
                  : "Individual"}
              </span>
              <span className={style.metaDot} aria-hidden="true" />
              <span className={style.metaPrice}>
                {info.eventAmount ? `\u20b9${info.eventAmount}` : "Free"}
              </span>
            </>
          )}
        </p>

        <h3 className={style.title}>
          <Link href={detailsHref} className={style.titleLink} onClick={onOpen}>
            {info.eventTitle || "Untitled event"}
          </Link>
        </h3>

        {info.eventdescription && (
          <p className={style.description}>
            {stripMarkdownForPreview(info.eventdescription)}
          </p>
        )}
      </div>

      {additionalContent && (
        <div className={style.extra}>{additionalContent}</div>
      )}

      <div className={style.footer}>
        {!isPast && showRegisterButton ? (
          <button
            type="button"
            className={style.cta}
            data-inert={isCtaInert ? "true" : undefined}
            aria-disabled={isCtaInert || undefined}
            onClick={handleForm}
          >
            {ctaContent()}
          </button>
        ) : (
          <Link href={detailsHref} className={style.ctaGhost} onClick={onOpen}>
            View details
          </Link>
        )}

        <div className={style.tools}>
          {!isPast && showShareButton && (
            <button
              type="button"
              className={style.tool}
              onClick={handleShare}
              aria-label={`Share ${info.eventTitle}`}
            >
              <Share2 size={16} aria-hidden="true" />
            </button>
          )}
          {!isPast &&
            isRegistered &&
            !isCurrentBatchEmail(authCtx.user?.email) && (
            <button
              type="button"
              className={style.tool}
              onClick={handleQRCode}
              aria-label="View attendance QR code"
            >
              <QrCode size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Always rendered. It used to be gated on an `isHovered` state, which no
          touch device ever sets — so admins on a phone could not reach Edit,
          Delete or Analytics at all. The fade-in on hover now lives in CSS,
          behind `@media (hover: hover)`, so pointer devices keep the reveal and
          touch devices simply always see the bar. */}
      {enableEdit && authCtx.user.access === "ADMIN" && (
        <div className={style.adminBar}>
          <button
            type="button"
            className={style.adminBtn}
            onClick={(e) => {
              e.preventDefault();
              if (onEdit) {
                authCtx.eventData = data;
                onEdit();
              }
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className={style.adminBtn}
            onClick={(e) => {
              e.preventDefault();
              const isConfirmed = window.confirm(
                `Do you really want to delete this event "${info.eventTitle}"?`
              );
              if (isConfirmed && onDelete) {
                authCtx.eventData = data;
                onDelete();
              }
            }}
          >
            Delete
          </button>
          <button
            type="button"
            className={style.adminBtn}
            aria-label="View analytics"
            onClick={() => router.push("/profile/events/Analytics/" + data.id)}
          >
            <BarChart3 size={14} aria-hidden="true" /> Analytics
          </button>
        </div>
      )}

      {isOpen && !isPast && (
        <Share onClose={() => setOpen(false)} urlpath={shareUrl} />
      )}
      {isQRModalOpen && !isPast && (
        <QRCodeModal onClose={handleCloseQRModal} eventId={data.id} />
      )}

      <Alert />
    </article>
  );
};

EventCard.propTypes = {
  data: PropTypes.object.isRequired,
  onOpen: PropTypes.func,
  type: PropTypes.string.isRequired,
  customStyles: PropTypes.object,
  showShareButton: PropTypes.bool,
  showRegisterButton: PropTypes.bool,
  additionalContent: PropTypes.node,
  aosDisable: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  enableEdit: PropTypes.bool,
  isLoading: PropTypes.bool,
  variant: PropTypes.oneOf(["default", "featured"]),
};

export default EventCard;
