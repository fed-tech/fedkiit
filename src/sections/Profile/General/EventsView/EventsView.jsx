"use client";

import { useContext, useEffect, useState } from "react";
import styles from "./styles/EventsView.module.scss";
import AuthContext from "../../../../context/AuthContext";

import { api } from "../../../../services";
import { ComponentLoading, MicroLoading } from "../../../../microInteraction";
import { FORM_ANALYTICS_ROLES_CLIENT } from "@/lib/auth/roles";
import Link from "next/link";

const Events = () => {
  const authCtx = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [certMap, setCertMap] = useState({});
  const [loadingCerts, setLoadingCerts] = useState(true); // New state for certificate loading

  // The public event page. There is no /profile/Events route, so the View
  // button in this table used to 404.
  const viewPath = "/Events";
  const analyticsPath = "/profile/events/Analytics";

  // Shared with the API route and the Analytics page, so the button cannot be
  // offered to someone the server will turn away — or withheld from someone it
  // would have served.
  const analyticsAccessRoles = FORM_ANALYTICS_ROLES_CLIENT;

  useEffect(() => {
    if (!authCtx.token) return;

    const fetchEventsData = async () => {
      try {
        const [response, attendanceResponse] = await Promise.all([
          api.get("/api/form/getAllForms"),
          fetch("/api/attendance/myAttendance", {
            headers: { Authorization: `Bearer ${authCtx.token}` }
          })
        ]);

        const attendanceData = await attendanceResponse.json();
        const attendedIds = attendanceData.success ? attendanceData.formIds : [];

        if (response.status === 200) {
          let fetchedEvents = response.data.events;
          const filteredEvents = fetchedEvents.filter((event) =>
            attendedIds.includes(event.id)
          );
          setEvents(sortEventsByDate(filteredEvents));
        } else {
          console.error("Error fetching event data:", response.data.message);
          setError({
            message:
              "Sorry for the inconvenience, we are having issues fetching your Events",
          });
        }
      } catch (error) {
        setError({
          message:
            "Sorry for the inconvenience, we are having issues fetching your Events",
        });
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventsData();
  }, [authCtx.token]);

  useEffect(() => {
    if (!authCtx.token) return;

    async function fetchCertificates() {
      try {
        const res = await fetch("/api/certificate/myCertificates", {
          headers: {
            Authorization: `Bearer ${authCtx.token}`
          }
        });

        const data = await res.json();
        setCertificates(data);
      } catch (err) {
        console.error("Error fetching certificates:", err);
      }
    }

    fetchCertificates();
  }, [authCtx.token]);

  const sortEventsByDate = (events) => {
    return events.sort(
      (a, b) => new Date(b.info.eventDate) - new Date(a.info.eventDate)
    );
  };

  const formatDate = (dateString) => {
    const options = { day: "2-digit", month: "2-digit", year: "numeric" };
    return new Date(dateString)
      .toLocaleDateString("en-GB", options)
      .replace(/\//g, "-");
  };

  useEffect(() => {
    const map = {};
    certificates?.forEach(cert => {
      map[cert.formId] = cert;
    });
    setCertMap(map);
    setLoadingCerts(false);
  }, [certificates]);

  return (
    <div className={styles.participatedEvents}>
      {authCtx.user.access !== "USER" ? (
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
                    <th className={styles.mobilewidth}>Details</th>
                    <th className={styles.mobilewidth}>Certificate</th>
                    {(analyticsAccessRoles.includes(authCtx.user.access) ||
                      authCtx.user.email == "srex@fedkiit.com") && (
                      <th
                        className={styles.mobilewidth}
                        style={{ paddingTop: "1rem" }}
                      >
                        Registrations
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {events?.map((event) => (
                    <tr key={event._id || event.id}>
                      <td
                        className={styles.mobilewidth}
                        style={{ fontWeight: "500", paddingRight: "10px" }}
                      >
                        {event.info.eventTitle}
                      </td>
                      <td style={{ fontWeight: "200" }}>
                        {formatDate(event.info.eventDate)}
                      </td>

                      {/* View Event Details - accessible to all */}
                      <td>
                        <Link href={`${viewPath}/${event.id}`}>
                          <button
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

                      {/* Certificate - accessible to all who have one */}
                      <td>
                        {loadingCerts ? (
                          <div>
                            <MicroLoading />
                          </div>
                        ) : certMap?.[event.id] ? (
                          <Link
                            href={`/verify/certificate?id=${certMap[event.id].certificateId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <button>
                              View
                            </button>
                          </Link>
                        ) : (
                          <button
                            disabled
                            style={{ opacity: 0.5 }}
                          >
                            Not Issued
                          </button>
                        )}
                      </td>

                      {/* Analytics - only for admins and specific roles */}
                      {(analyticsAccessRoles.includes(authCtx.user.access) ||
                        authCtx.user.email === "srex@fedkiit.com") && (
                        <td>
                          <Link href={`${analyticsPath}/${event.id}`}>
                            <button
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
                  ))}
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