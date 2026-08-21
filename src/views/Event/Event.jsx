"use client";

import { useCallback, useContext, useEffect, useState } from "react";

import { api } from "../../services";
import style from "./styles/Event.module.scss";
import AuthContext from "../../context/AuthContext";
import { EventCard, EventCardSkeleton } from "../../components";
import { ErrorArt, NoEventsArt } from "./components/Artwork";
import Disclosure from "./components/Disclosure";
import { RecoveryContext } from "../../context/RecoveryContext";
import ShareTeamData from "../../features/Modals/Event/ShareModal/ShareTeamData";
import Link from "next/link";

const PAST_PREVIEW_COUNT = 4;

const Event = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const authCtx = useContext(AuthContext);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setOpenModal] = useState(false);
  const [pastEvents, setPastEvents] = useState([]);
  const [ongoingEvents, setOngoingEvents] = useState([]);
  const recoveryCtx = useContext(RecoveryContext);
  const [eventName, setEventName] = useState("");
  // A count, not a list — it was initialised to [], so `=== 0` was false until
  // the effect below first ran.
  const [parentEventCount, setParentEventCount] = useState(0);

  useEffect(() => {
    if (
      (recoveryCtx.teamCode && recoveryCtx.teamName) ||
      recoveryCtx.successMessage
    ) {
      if (!isOpen) {
        setOpenModal(true);
      }
    }
  }, [recoveryCtx.teamCode, recoveryCtx.successMessage]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get("/api/form/getAllForms");
        if (response.status === 200) {
          const fetchedEvents = response.data.events;
          const sortedEvents = fetchedEvents.sort((a, b) => {
            const priorityA = parseInt(a.info.eventPriority, 10);
            const priorityB = parseInt(b.info.eventPriority, 10);
            const dateA = new Date(a.info.eventDate);
            const dateB = new Date(b.info.eventDate);
            const titleA = a.info.eventTitle || "";
            const titleB = b.info.eventTitle || "";

            // compare by priority (lower priority first)
            if (priorityA !== priorityB) {
              return priorityA - priorityB;
            }

            // If priorities are the same, compare by date (earliest date first)
            if (dateA.getTime() !== dateB.getTime()) {
              return dateA.getTime() - dateB.getTime();
            }

            // If both priority and date are the same, compare alphabetically by title
            return titleA.localeCompare(titleB);
          });

          const ongoing = sortedEvents.filter(
            (event) => !event.info.isEventPast
          );
          const past = sortedEvents.filter((event) => event.info.isEventPast);
          const sortedPastEvents = past.sort((a, b) => {
            return new Date(b.info.eventDate) - new Date(a.info.eventDate);
          });

          setOngoingEvents(ongoing);
          setPastEvents(sortedPastEvents);
        } else {
          setError({
            message:
              "Sorry for the inconvenience, we are having issues fetching our Events",
          });
        }
      } catch (error) {
        setError({
          message:
            "Sorry for the inconvenience, we are having issues fetching our Events",
        });
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleShare = () => {
    if (
      (recoveryCtx.teamCode && recoveryCtx.teamName) ||
      recoveryCtx.successMessage
    ) {
      const { setTeamCode, setTeamName, setSuccessMessage } = recoveryCtx;
      setTeamCode(null);
      setTeamName(null);
      setSuccessMessage(null);
      setOpenModal(false);
    }
  };

  // Resolves an event's prerequisite to its title.
  //
  // The "you need to register for X first" toast used to name whichever event
  // happened to be listed first with no prerequisite of its own — a page-level
  // guess that had nothing to do with the card being clicked. On this data it
  // told people to go and register for "Form test" when the event actually
  // required Omega4.0, which is worse than saying nothing.
  const prerequisiteTitleOf = useCallback(
    (event) => {
      const id = event?.info?.relatedEvent;
      if (!id || id === "null") return "";
      const all = [...ongoingEvents, ...pastEvents];
      return all.find((e) => e.id === id)?.info?.eventTitle ?? "";
    },
    [ongoingEvents, pastEvents]
  );

  // The page-level banner names the prerequisite the gated events on this page
  // actually point at, for the same reason.
  useEffect(() => {
    const gated = ongoingEvents.find((event) => prerequisiteTitleOf(event));
    setEventName(gated ? prerequisiteTitleOf(gated) : "");
  }, [ongoingEvents, prerequisiteTitleOf]);

  useEffect(() => {
    const registeredEventIds = authCtx.user.regForm || [];

    // Looked up against the events actually fetched from the API. This used to
    // search the bundled FormData.json sample, so the count reflected mock
    // records rather than what the member is really registered for.
    const allEvents = [...ongoingEvents, ...pastEvents];

    const parentEvents = registeredEventIds
      .map((id) => allEvents.find((event) => event.id === id))
      .filter(
        (event) =>
          event?.info?.relatedEvent == null ||
          event.info.relatedEvent === "null"
      );

    setParentEventCount(parentEvents.length);
  }, [ongoingEvents, pastEvents, authCtx.user.regForm]);

  const teamCodeAndName = {
    teamCode: recoveryCtx.teamCode,
    teamName: recoveryCtx.teamName,
  };

  const successMessage = { successMessage: recoveryCtx.successMessage };

  const openEvents = ongoingEvents.filter((event) => event.info.isPublic);
  const publicPastEvents = pastEvents.filter((event) => event.info.isPublic);
  const displayedPastEvents = publicPastEvents.slice(0, PAST_PREVIEW_COUNT);

  // Registration can stay open on events whose date has already passed, so the
  // spotlight picks the soonest event that is genuinely still ahead of us and
  // only falls back to the priority order when nothing upcoming is left.
  const upcoming = openEvents
    .filter((event) => new Date(event.info.eventDate).getTime() >= Date.now())
    .sort((a, b) => new Date(a.info.eventDate) - new Date(b.info.eventDate));

  const spotlight = upcoming[0] || openEvents[0];
  const remainingOpen = openEvents.filter((event) => event.id !== spotlight?.id);

  // Spelling out how far away the event is makes "upcoming" concrete in a way
  // that a bare date never does.
  const countdown = (() => {
    if (!upcoming[0]) return null;
    const start = new Date(upcoming[0].info.eventDate);
    const midnight = (d) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round(
      (midnight(start) - midnight(new Date())) / 86400000
    );
    if (days <= 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days < 30) return `In ${days} days`;
    const months = Math.round(days / 30);
    return `In ${months} month${months > 1 ? "s" : ""}`;
  })();

  // `parentEventCount === 0` already says "has not registered for any event
  // that gates others", which is exactly what this notice is for.
  const showPrerequisiteNotice =
    parentEventCount === 0 &&
    authCtx.isLoggedIn &&
    authCtx.user.access === "USER" &&
    Boolean(eventName);

  return (
    <>
      {isOpen && (
        <ShareTeamData
          onClose={handleShare}
          teamData={teamCodeAndName}
          successMessage={successMessage}
        />
      )}

      <main className={style.page}>
        <div className={style.shell}>
        

          {isLoading ? (
            <>
              <section className={style.group} aria-busy="true">
                <div className={style.groupHead}>
                  <h2 className={style.groupTitle}>Happening next</h2>
                  <span className={style.skeletonCountdown} aria-hidden="true" />
                </div>
                <EventCardSkeleton variant="featured" />
              </section>

              <section className={style.group} aria-busy="true">
                <div className={style.groupHead}>
                  <div className={style.skeletonGroupToggle} aria-hidden="true">
                    <span className={style.skeletonChevron} />
                    <span className={style.skeletonGroupLabel} />
                    <span className={style.skeletonGroupCount} />
                  </div>
                </div>
                <div className={style.grid}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <EventCardSkeleton key={i} />
                  ))}
                </div>
              </section>

              <span className={style.srOnly}>Loading events</span>
            </>
          ) : error ? (
            <div className={style.state} role="alert">
              <ErrorArt className={style.stateArt} />
              <h2 className={style.stateTitle}>We couldn&rsquo;t load events</h2>
              <p className={style.stateBody}>{error.message}</p>
              <button
                type="button"
                className={style.stateAction}
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {showPrerequisiteNotice && (
                <aside className={style.notice}>
                  <span className={style.noticeDot} aria-hidden="true" />
                  <p className={style.noticeText}>
                    Register for <strong>{eventName}</strong> to unlock the
                    remaining events.
                  </p>
                </aside>
              )}

              {spotlight ? (
                <section className={style.group}>
                  <div className={style.groupHead}>
                    <h2 className={style.groupTitle}>
                      {upcoming[0] ? "Happening next" : "Featured"}
                    </h2>
                    {countdown && (
                      <span className={style.countdown}>{countdown}</span>
                    )}
                  </div>
                  <EventCard
                    key={spotlight.id}
                    data={spotlight}
                    onOpen={() => {}}
                    type="ongoing"
                    variant="featured"
                    isLoading={false}
                    eventName={prerequisiteTitleOf(spotlight)}
                  />
                </section>
              ) : (
                <section className={style.group}>
                  <div className={style.groupHead}>
                    <h2 className={style.groupTitle}>Open for registration</h2>
                  </div>
                  <div className={style.state}>
                    <NoEventsArt className={style.stateArt} />
                    <h3 className={style.stateTitle}>Nothing open right now</h3>
                    <p className={style.stateBody}>
                      New events are announced here. Browse what we&rsquo;ve run
                      before in the meantime.
                    </p>
                  </div>
                </section>
              )}

              {remainingOpen.length > 0 && (
                <Disclosure
                  title="Also open"
                  count={remainingOpen.length}
                  defaultOpen
                >
                  <div className={style.grid}>
                    {remainingOpen.map((event) => (
                      <EventCard
                        key={event.id}
                        data={event}
                        onOpen={() => {}}
                        type="ongoing"
                        isLoading={false}
                        eventName={prerequisiteTitleOf(event)}
                      />
                    ))}
                  </div>
                </Disclosure>
              )}

              {displayedPastEvents.length > 0 && (
                <Disclosure
                  title="Past events"
                  count={publicPastEvents.length}
                  action={
                    publicPastEvents.length > PAST_PREVIEW_COUNT ? (
                      <Link href="/Events/pastEvents" className={style.groupLink}>
                        View all
                      </Link>
                    ) : null
                  }
                >
                  <div className={style.grid}>
                    {displayedPastEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        data={event}
                        onOpen={() => {}}
                        type="past"
                        isLoading={false}
                      />
                    ))}
                  </div>
                </Disclosure>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default Event;
