"use client";

import React, { useState, useEffect, useContext, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Blurhash } from "react-blurhash";
import { MdArrowBackIos, MdGroups } from "react-icons/md";
import { FaUser, FaRupeeSign } from "react-icons/fa";
import { IoIosLock } from "react-icons/io";
import { PiClockCountdownDuotone } from "react-icons/pi";
import { Share2 } from "lucide-react";
import { parse, differenceInMilliseconds } from "date-fns";

import AuthContext from "../../context/AuthContext";
import { api } from "../../services";
import { Alert, MicroLoading, ComponentLoading } from "../../microInteraction";
import Share from "../../features/Modals/Event/ShareModal/ShareModal";
import { isPrerequisiteMet } from "../../utils/prerequisite";
import {
  batchRegistrationErrorMessage,
  isBatchRegistrationBlocked,
} from "../../utils/batchRestriction";
import { MarkdownContent } from "../../components/Core";
import style from "./styles/EventDetail.module.scss";

/**
 * /Events/:eventId — the event detail page.
 *
 * Replaces EventModal, which rendered as a fixed overlay on top of the still
 * mounted listing. The behaviour is deliberately carried over unchanged — the
 * countdown, the button state machine and the related-event lock are the same
 * rules as before, so an event that was registerable in the modal is
 * registerable here. Only the shell and the styling differ, and the styling now
 * uses the tokens in globals.scss rather than the old modal's own palette.
 */
const EventDetail = () => {
  const router = useRouter();
  const { eventId } = useParams();
  const authCtx = useContext(AuthContext);

  const [info, setInfo] = useState({});
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [alert, setAlert] = useState(null);
  const [isMicroLoading, setIsMicroLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState("");
  const [btnTxt, setBtnTxt] = useState("Register Now");
  const [ongoingEvents, setOngoingEvents] = useState([]);
  const [isShareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // Read off `window` in an effect, not during render — this component is
  // server-rendered first, where `window` does not exist.
  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (alert) {
      const { type, message, position, duration } = alert;
      Alert({ type, message, position, duration });
      setAlert(null);
    }
  }, [alert]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await api.get("/api/form/getAllForms");
        if (response.status === 200) {
          const fetchedEvents = response.data.events ?? [];
          setOngoingEvents(fetchedEvents.filter((e) => !e.info.isEventPast));

          const eventData = fetchedEvents.find((e) => e.id === eventId);
          if (eventData) {
            setData(eventData);
            setInfo(eventData.info ?? {});
          } else {
            setNotFound(true);
          }
        } else {
          setNotFound(true);
          setAlert({
            type: "error",
            message:
              "There was an error fetching event details. Please try again.",
            position: "bottom-right",
            duration: 3000,
          });
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        setNotFound(true);
        setAlert({
          type: "error",
          message:
            "There was an error fetching event details. Please try again.",
          position: "bottom-right",
          duration: 3000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const calculateRemainingTime = useCallback(() => {
    const regStartDate = parse(
      info.regDateAndTime,
      "MMMM do yyyy, h:mm:ss a",
      new Date()
    );
    const timeDifference = differenceInMilliseconds(regStartDate, new Date());

    if (timeDifference <= 0) {
      setRemainingTime(null);
      return;
    }

    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeDifference / (1000 * 60)) % 60);
    const seconds = Math.floor((timeDifference / 1000) % 60);

    setRemainingTime(
      days > 0
        ? `${days} day${days > 1 ? "s" : ""} left`
        : [
            hours > 0 ? `${hours}h ` : "",
            minutes > 0 ? `${minutes}m ` : "",
            seconds > 0 ? `${seconds}s` : "",
          ]
            .join("")
            .trim()
    );
  }, [info.regDateAndTime]);

  useEffect(() => {
    if (info.regDateAndTime) {
      calculateRemainingTime();
      const intervalId = setInterval(calculateRemainingTime, 1000);
      return () => clearInterval(intervalId);
    }
  }, [info.regDateAndTime, calculateRemainingTime]);

  // One effect owns the label, for the reason spelled out in EventCard: an
  // early `return` on the signed-out path left the previous user's "Already
  // Registered" on screen after logging out.
  useEffect(() => {
    const openState = () => {
      if (remainingTime) return remainingTime;
      if (info.isRegistrationClosed || info.isEventPast) return "Closed";
      return "Register Now";
    };

    if (!authCtx.isLoggedIn || !data) {
      setBtnTxt(openState());
      return;
    }

    if ((authCtx.user?.regForm || []).includes(data.id)) {
      setBtnTxt("Already Registered");
      return;
    }

    // This event's own prerequisite, not "any prerequisite anywhere on the
    // page" — see src/utils/prerequisite.js. Admins stay unlocked.
    if (
      !isPrerequisiteMet(data?.info, authCtx.user?.regForm) &&
      authCtx.user?.access === "USER"
    ) {
      setBtnTxt(info.isRegistrationClosed || info.isEventPast ? "Closed" : "Locked");
      return;
    }

    if (isBatchRegistrationBlocked(authCtx.user?.email)) {
      setBtnTxt(info.isRegistrationClosed || info.isEventPast ? "Closed" : "Not Eligible");
      return;
    }

    setBtnTxt(openState());
  }, [
    authCtx.isLoggedIn,
    authCtx.user?.regForm,
    authCtx.user?.access,
    data,
    info.isRegistrationClosed,
    info.isEventPast,
    remainingTime,
  ]);

  const handleForm = () => {
    if (!authCtx.isLoggedIn) {
      sessionStorage.setItem("prevPage", window.location.pathname);
      router.push(`/Login?next=/Events/${eventId}`);
      return;
    }

    if (authCtx.user.access !== "USER" && authCtx.user.access !== "ADMIN") {
      setBtnTxt("Already Member");
      setAlert({
        type: "info",
        message: "Team Members are not allowed to register for the Event",
        position: "bottom-right",
        duration: 3000,
      });
      return;
    }

    if (isBatchRegistrationBlocked(authCtx.user.email)) {
      setAlert({
        type: "info",
        message: batchRegistrationErrorMessage(),
        position: "bottom-right",
        duration: 4000,
      });
      return;
    }

    // The modal waited three seconds before navigating, purely to let a toast
    // finish. On a page that just reads as an unresponsive button.
    setIsMicroLoading(true);
    router.push(`/Events/${data?.id}/Form`);
  };

  const formattedDate = (() => {
    if (!info.eventDate) return "";
    const date = new Date(info.eventDate);
    if (Number.isNaN(date.getTime())) return "";
    const day = date.getDate();
    const suffix =
      day > 3 && day < 21
        ? "th"
        : { 1: "st", 2: "nd", 3: "rd" }[day % 10] || "th";
    return `${day}${suffix} ${date.toLocaleDateString("en-GB", {
      month: "long",
    })} ${date.getFullYear()}`;
  })();

  const isActionable = btnTxt === "Register Now";

  if (isLoading) {
    return (
      <div className={style.page}>
        <ComponentLoading
          customStyles={{
            width: "100%",
            minHeight: "60vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className={style.page}>
        <div className={style.missing}>
          <h1 className={style.missingTitle}>Event not found</h1>
          <p className={style.missingBody}>
            This event may have been removed, or the link may be out of date.
          </p>
          <Link href="/Events" className={style.primary}>
            Back to events
          </Link>
        </div>
        <Alert />
      </div>
    );
  }

  return (
    <div className={style.page}>
      <Link href="/Events" className={style.back}>
        <MdArrowBackIos size={14} aria-hidden="true" />
        Back to events
      </Link>

      <article className={style.card}>
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
          {info.eventImg && (
            <img
              src={info.eventImg}
              className={style.image}
              style={{ opacity: imageLoaded ? 1 : 0 }}
              alt=""
              onLoad={() => setImageLoaded(true)}
            />
          )}
          {formattedDate && <span className={style.date}>{formattedDate}</span>}
          <button
            type="button"
            className={style.share}
            onClick={() => setShareOpen((open) => !open)}
            aria-label="Share this event"
          >
            <Share2 size={16} aria-hidden="true" />
          </button>
        </div>

        <div className={style.body}>
          <h1 className={style.title}>{info.eventTitle}</h1>

          <div className={style.meta}>
            {info.participationType === "Team" ? (
              <span className={style.metaItem}>
                <MdGroups className={style.metaIcon} size={18} />
                Team of {info.minTeamSize}&ndash;{info.maxTeamSize}
              </span>
            ) : (
              <span className={style.metaItem}>
                <FaUser className={style.metaIcon} size={12} />
                Individual
              </span>
            )}
            <span className={style.metaDot} aria-hidden="true" />
            <span className={style.metaItem}>
              {info.eventAmount ? (
                <>
                  <FaRupeeSign className={style.metaIcon} size={12} />
                  {info.eventAmount}
                </>
              ) : (
                "Free"
              )}
            </span>
          </div>

          {info.eventdescription && (
            <div className={style.description}>
              <MarkdownContent>{String(info.eventdescription)}</MarkdownContent>
            </div>
          )}

          <div className={style.actions}>
            <button
              type="button"
              className={style.primary}
              onClick={handleForm}
              disabled={!isActionable}
              data-inert={!isActionable}
            >
              {isMicroLoading ? (
                <MicroLoading />
              ) : btnTxt === "Closed" ? (
                <>
                  Closed
                  <IoIosLock aria-hidden="true" />
                </>
              ) : btnTxt === "Locked" ? (
                <>
                  Locked
                  <IoIosLock aria-hidden="true" />
                </>
              ) : btnTxt === "Not Eligible" ? (
                <>
                  Not eligible
                  <IoIosLock aria-hidden="true" />
                </>
              ) : remainingTime && btnTxt === remainingTime ? (
                <>
                  <PiClockCountdownDuotone aria-hidden="true" />
                  {btnTxt}
                </>
              ) : (
                btnTxt
              )}
            </button>

            {btnTxt === "Locked" && (
              <p className={style.hint}>
                This event unlocks once you have registered for its prerequisite
                event.
              </p>
            )}
            {btnTxt === "Not Eligible" && (
              <p className={style.hint}>{batchRegistrationErrorMessage()}</p>
            )}
          </div>
        </div>
      </article>

      {isShareOpen && (
        <Share onClose={() => setShareOpen(false)} urlpath={shareUrl} />
      )}
      <Alert />
    </div>
  );
};

export default EventDetail;
