"use client";

import { useContext, useEffect, useState } from "react";
import styles from "./styles/CertificatesView.module.scss";
import AuthContext from "../../../../context/AuthContext";

import { api } from "../../../../services";
import { ComponentLoading } from "../../../../microInteraction";
import Link from "next/link";

const Events = () => {
  const authCtx = useContext(AuthContext);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);
  const [certCounts, setCertCounts] = useState<Record<string, number>>({});

  const SendCertificatePath = "/profile/events/SendCertificate";
  const createCertificatesPath = "/profile/events/createCertificates";
  const viewCertificatesPath = "/profile/events/viewCertificates";

  const analyticsAccessRoles = [
    "PRESIDENT",
    "VICEPRESIDENT",
    "DIRECTOR_CREATIVE",
    "DIRECTOR_TECHNICAL",
    "DIRECTOR_MARKETING",
    "DIRECTOR_OPERATIONS",
    "DIRECTOR_SPONSORSHIP",
    "ADMIN",
  ];

  useEffect(() => {
    const fetchEventsData = async () => {
      setIsLoading(true);
      try {
        const response = await api.get("/api/form/getAllForms");
        const userEvents = authCtx?.user?.regForm ?? [];

        if (response.status === 200) {
          let fetchedEvents = response.data.events ?? [];
          if (authCtx?.user?.access !== "USER") {
            // non-user (admin etc.) see all events
            setEvents(sortEventsByDate(fetchedEvents));
          } else {
            // users see only registered events
            const filteredEvents = fetchedEvents.filter((event: any) =>
              userEvents.includes(event.id ?? event._id)
            );
            setEvents(sortEventsByDate(filteredEvents));
          }
        } else {
          console.error("Error fetching event data:", response.data?.message);
          setError({
            message:
              "Sorry for the inconvenience, we are having issues fetching your Events",
          });
        }
      } catch (err) {
        console.error("Error fetching events:", err);
        setError({
          message:
            "Sorry for the inconvenience, we are having issues fetching your Events",
        });
      } finally {
        setIsLoading(false);
      }
    };

    // only fetch if authCtx.user exists
    if (authCtx?.user) {
      fetchEventsData();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authCtx?.user?.email, authCtx?.user]);

  useEffect(() => {
    // fetch certificate counts for shown events
    const loadCounts = async () => {
      if (!events || events.length === 0) {
        setCertCounts({});
        return;
      }

      const promises = events.map(async (ev) => {
        const id = ev.id ?? ev._id;
        if (!id) return { id: null, count: 0 };

        try {
          // Try to fetch a list of certificates for the event and use length as count.
          // Adjust endpoint if your backend has a dedicated count endpoint.
          const resp = await api.get(`/api/certificates/${id}`);
          // resp.data may be { files: [...] } or an array; be defensive:
          const data = resp.data;
          let count = 0;
          if (Array.isArray(data)) count = data.length;
          else if (Array.isArray(data.files)) count = data.files.length;
          else if (Array.isArray(data.certificates)) count = data.certificates.length;
          else if (typeof data.count === "number") count = data.count;
          else count = 0;
          return { id, count };
        } catch (e) {
          // If endpoint fails, fallback to 0
          return { id, count: 0 };
        }
      });

      const results = await Promise.all(promises);
      const map: Record<string, number> = {};
      results.forEach((r) => {
        if (r.id) map[r.id] = r.count;
      });
      setCertCounts(map);
    };

    loadCounts();
  }, [events]);

  const sortEventsByDate = (evts: any[]) => {
    // copy before sorting to avoid mutating original array
    return [...(evts ?? [])].sort(
      (a, b) =>
        new Date(b.info?.eventDate ?? 0).getTime() -
        new Date(a.info?.eventDate ?? 0).getTime()
    );
  };

  const getEventId = (event) => {
    const candidates = [
      event?.id,
      event?._id,
      event?.formId,
      event?.eventId,
      event?.info?.id,
      event?.info?._id,
      event?.info?.formId,
      event?.info?.eventId,
      event?.extra?.id,
      event?.extra?._id,
      event?.extra?.formId,
      event?.extra?.eventId,
    ];

    return candidates.find(
      (value) => value !== undefined && value !== null && value !== "" && value !== "undefined" && value !== "null"
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const options = { day: "2-digit", month: "2-digit", year: "numeric" } as const;
    return new Date(dateString)
      .toLocaleDateString("en-GB", options)
      .replace(/\//g, "-");
  };

  return (
    <div className={styles.participatedEvents}>
      {authCtx?.user?.access !== "USER" ? (
        <div className={styles.proHeading}>
          <h3 className={styles.headInnerText}>
            <span>Events</span> Timeline
          </h3>
        </div>
      ) : (
        <div className={styles.proHeading}>
          <h3 className={styles.headInnerText}>
            <span>Participated</span> Events
          </h3>
        </div>
      )}

      {isLoading ? (
        <ComponentLoading />
      ) : (
        <>
          {error && <div className={styles.error}>{error.message}</div>}

          <div className={styles.tables}>
            {events.length > 0 ? (
              <table className={styles.eventsTable}>
                <thead>
                  <tr>
                    <th className={styles.mobilewidth}>Event Name</th>
                    <th className={styles.mobilewidth}>Event Date</th>
                    <th className={styles.mobilewidth}>Certificates</th>
                    {(analyticsAccessRoles.includes(authCtx?.user?.access) ||
                      authCtx?.user?.email === "srex@fedkiit.com") && (
                      <>
                        <th className={styles.mobilewidth}>Manage Mail</th>
                        <th className={styles.mobilewidth}>Create/Edit</th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {events.map((event) => {
                    const id = getEventId(event)?.toString();
                    if (!id) {
                      console.warn("Certificate list event missing id:", event);
                      return null;
                    }

                    const certCount = certCounts[id] ?? 0;

                    return (
                      <tr key={id}>
                        <td
                          className={styles.mobilewidth}
                          style={{ fontWeight: "500", paddingRight: "10px" }}
                        >
                          {event.info?.eventTitle ?? "Untitled Event"}
                        </td>

                        <td style={{ fontWeight: "200" }}>
                          {formatDate(event.info?.eventDate)}
                        </td>

                        <td className={styles.mobilewidthtd}>
                          <Link href={`${viewCertificatesPath}/${id}`}>
                            <button
                              className={styles.viewButton}
                              style={{
                                marginLeft: "auto",
                                whiteSpace: "nowrap",
                                height: "fit-content",
                                color: "orange",
                              }}
                              disabled={certCount === 0}
                              title={
                                certCount === 0
                                  ? "No certificates generated for this event"
                                  : `View ${certCount} certificate(s)`
                              }
                            >
                              {certCount === 0 ? "No Certificates" : `View (${certCount})`}
                            </button>
                          </Link>
                        </td>

                        {(analyticsAccessRoles.includes(authCtx?.user?.access) ||
                          authCtx?.user?.email === "srex@fedkiit.com") && (
                          <td className={styles.mobilewidthtd}>
                            <Link href={`${SendCertificatePath}/${id}`}>
                              <button
                                className={styles.viewButton}
                                style={{
                                  marginLeft: "auto",
                                  whiteSpace: "nowrap",
                                  height: "fit-content",
                                  color: "orange",
                                }}
                              >
                                View
                              </button>
                            </Link>
                          </td>
                        )}

                        {(analyticsAccessRoles.includes(authCtx?.user?.access) ||
                          authCtx?.user?.email === "srex@fedkiit.com") && (
                          <td className={styles.mobilewidthtd}>
                            <Link href={`${createCertificatesPath}/${id}`}>
                              <button
                                className={styles.viewButton}
                                style={{
                                  marginLeft: "auto",
                                  whiteSpace: "nowrap",
                                  height: "fit-content",
                                  color: "orange",
                                }}
                              >
                                View
                              </button>
                            </Link>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className={styles.noEvents}>Not participated in any Events</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Events;