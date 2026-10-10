"use client";

import { useContext, useEffect, useState } from "react";
import styles from "./styles/CertificatesView.module.scss";
import AuthContext from "../../../../context/AuthContext";

import { api } from "../../../../services";
import { ComponentLoading } from "../../../../microInteraction";
import { Send } from "lucide-react";
import Link from "next/link";

const Events = () => {
  const authCtx = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [certMap, setCertMap] = useState({});
  const [loadingCerts, setLoadingCerts] = useState(true);
  const viewPath = "/profile/Events";
  const SendCertificatePath = "/profile/events/SendCertificate";
  const analyticsPath = "/profile/events/Analytics";
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

  useEffect(() => {
    const map = {};
    certificates?.forEach(cert => {
      map[cert.formId] = cert;
    });
    setCertMap(map);
    setLoadingCerts(false);
  }, [certificates]);

  const sortEventsByDate = (events) => {
    return events.sort((a, b) => new Date(b.info.eventDate) - new Date(a.info.eventDate));
  };

  const formatDate = (dateString) => {
    const options = { day: "2-digit", month: "2-digit", year: "numeric" };
    return new Date(dateString)
      .toLocaleDateString("en-GB", options)
      .replace(/\//g, "-");
  };

  // console.log("Event Access",authCtx?.user?.access);
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
                    {(analyticsAccessRoles.includes(authCtx?.user?.access) || authCtx?.user?.email == "srex@fedkiit.com") && (
                        <>
                      <th className={styles.mobilewidth}>Manage Mail</th>
                      <th className={styles.mobilewidth}>Create/Edit</th>
                      </>
                    )}
                    {/* Add more headers */}
                  </tr>
                </thead>

                <tbody>
                  {events?.filter(e => certMap?.[e.id])?.map((event) => (
                    <tr key={event._id || event.id}>
                      <td className={styles.mobilewidth} style={{fontWeight:"500",paddingRight:"10px"}}>
                        {event.info.eventTitle}
                      </td>
                      <td style={{ fontWeight: "200" }}>
                        {formatDate(event.info.eventDate)}
                      </td>

                      <td>
                        <Link href={`${viewCertificatesPath}/${event.id}`}>
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
                      {(analyticsAccessRoles.includes(authCtx?.user?.access) || authCtx?.user?.email == "srex@fedkiit.com") && (
                        <td>
                          <Link href={`${SendCertificatePath}/${event.id}`}>
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
                      {(analyticsAccessRoles.includes(authCtx?.user?.access) || authCtx?.user?.email == "srex@fedkiit.com") && (
                        <td>
                          <Link href={`${createCertificatesPath}/${event.id}`}>
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
