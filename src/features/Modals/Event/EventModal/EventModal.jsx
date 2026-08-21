"use client";

/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useContext } from "react";
import EventCardModal from "./styles/EventModal.module.scss";
import groupIcon from "../../../../assets/images/groups.svg";
import rupeeIcon from "../../../../assets/images/rupeeIcon.svg";
import { X } from "lucide-react";

// import eventData from "../../../../data/eventData.json";
import shareOutline from "../../../../assets/images/shareOutline.svg";
import Share from "../../../../features/Modals/Event/ShareModal/ShareModal";
// import AOS from "aos";
// import "aos/dist/aos.css";
import { MdGroups } from "react-icons/md";
import { FaUser, FaRupeeSign } from "react-icons/fa";
import { CiLock } from "react-icons/ci";
import { PiClockCountdownDuotone } from "react-icons/pi";
import AuthContext from "../../../../context/AuthContext";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { SkeletonTheme } from "react-loading-skeleton";
import { IoIosLock } from "react-icons/io";
import { Blurhash } from "react-blurhash";
import {
  MicroLoading,
  Alert,
  ComponentLoading,
} from "../../../../microInteraction";
import { api } from "../../../../services";
import { parse, differenceInMilliseconds, formatDistanceToNow } from "date-fns";
import { MarkdownContent } from "../../../../components/Core";
import {
  batchRegistrationErrorMessage,
  isBatchRegistrationBlocked,
} from "../../../../utils/batchRestriction";
import eventDefaultImg from "../../../../assets/images/defaultEventModal.png";
import { useRouter, useParams } from "next/navigation";

const EventModal = (props) => {
  const { onClosePath } = props;
  const router = useRouter();
  const [remainingTime, setRemainingTime] = useState("");
  const [btnTxt, setBtnTxt] = useState("Register Now");
  const authCtx = useContext(AuthContext);
  const [isMicroLoading, setIsMicroLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { eventId } = useParams();
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const [navigatePath, setNavigatePath] = useState("/");
  const [isLoading, setIsLoading] = useState(true);
  const [info, setInfo] = useState({});
  const [data, setData] = useState({});
  const [isRegisteredInRelatedEvents, setIsRegisteredInRelatedEvents] =
    useState(false);
  const [pastEvents, setPastEvents] = useState([]);
  const [ongoingEvents, setOngoingEvents] = useState([]);

  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await api.get("/api/form/getAllForms");
        if (response.status === 200) {
          const fetchedEvents = response.data.events;
          // Separate ongoing and past events
          const ongoing = fetchedEvents.filter(
            (event) => !event.info.isEventPast
          );
          const past = fetchedEvents.filter((event) => event.info.isEventPast);

          setOngoingEvents(ongoing);
          setPastEvents(past);

          const eventData = response.data?.events.find((e) => e.id === eventId);
          // console.log("fetched event modal test:", eventData);
          setData(eventData);
          setInfo(eventData?.info);
        } else {
          setAlert({
            type: "error",
            message:
              "There was an error fetching event details. Please try again.",
            position: "bottom-right",
            duration: 3000,
          });
          throw new Error(response.data.message || "Error fetching event");
        }
      } catch (error) {
        console.error("Error fetching event:", error);

        setAlert({
          type: "error",
          message: "There was an error fetching event form. Please try again.",
          position: "bottom-right",
          duration: 3000,
        });
        // Fallback to local data
        // const { events } = FormData;
        // const data = events.find((event) => event.id === parseInt(eventId));
        // console.log(data);
        // const info = data.info;
        // setData(data);
        // setInfo(info);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

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
    if (info.regDateAndTime) {
      calculateRemainingTime();
      const intervalId = setInterval(calculateRemainingTime, 1000);
      return () => clearInterval(intervalId);
    }
  }, [info.regDateAndTime]);

  //Calculating data of event
  const dateStr = info.eventDate;
  const date = new Date(dateStr);

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

  const dayWithSuffix = day + getOrdinalSuffix(day);
  const month = date.toLocaleDateString("en-GB", { month: "long" });
  const year = date.getFullYear(); // Get the full year

  const formattedDate = `${dayWithSuffix} ${month} ${year}`;

  const calculateRemainingTime = () => {
    // Parse the regDateAndTime received from backend
    const regStartDate = parse(
      info.regDateAndTime,
      "MMMM do yyyy, h:mm:ss a",
      new Date()
    );
    const now = new Date();

    // Calculate the time difference in milliseconds
    const timeDifference = differenceInMilliseconds(regStartDate, now);

    if (timeDifference <= 0) {
      setRemainingTime(null);
      return;
    }

    // Calculate the days, hours, minutes, and seconds remaining
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

  // Update button text based on registration status and remaining time
  useEffect(() => {
    if (info.isRegistrationClosed || info.isEventPast) {
      setBtnTxt("Closed");
    } else if (remainingTime) {
      if (authCtx.user.access === "USER") {
        setBtnTxt("Locked");
      }
      setBtnTxt(remainingTime);
    } else {
      setBtnTxt("Register Now");
    }
  }, [info.isRegistrationClosed, remainingTime]);

  useEffect(() => {
    // Get registered event IDs from auth context
    const registeredEventIds = authCtx.user.regForm || [];

    // Collect related event IDs, filtering out null, undefined, and 'null'
    const relatedEventIds = ongoingEvents
      .map((event) => event.info.relatedEvent) // Extract relatedEvent IDs
      .filter((id) => id !== null && id !== undefined && id !== "null")
      .filter((id, index, self) => self.indexOf(id) === index);

    // Check if user is registered in any related events
    let isRegisteredInRelatedEvents = false;
    if (registeredEventIds.length > 0 && relatedEventIds.length > 0) {
      isRegisteredInRelatedEvents = relatedEventIds.some((relatedEventId) =>
        registeredEventIds.includes(relatedEventId)
      );
    }

    // console.log(
    //   "Is Registered in Related Events:",
    //   isRegisteredInRelatedEvents
    // );

    if (isRegisteredInRelatedEvents) {
      setIsRegisteredInRelatedEvents(true);
    }
  }, [ongoingEvents, authCtx.user.regForm]);

  useEffect(() => {
    if (authCtx.isLoggedIn && authCtx.user.regForm) {
      if (info.isRegistrationClosed) {
        setBtnTxt("Closed");
      }
      if (isRegisteredInRelatedEvents) {
        // console.log("checking for ", data?.id);
        if (data?.info?.relatedEvent === "null") {
          if (authCtx.user.regForm.includes(data.id)) {
            setBtnTxt("Already Registered");
          }
        } else {
          if (authCtx.user.regForm.includes(data?.id)) {
            setBtnTxt("Already Registered");
          } else {
            if (remainingTime) {
              setBtnTxt(remainingTime);
            } else if (data?.info?.isRegistrationClosed) {
              setBtnTxt("Closed");
            } else {
              setBtnTxt("Register Now");
            }
          }
        }
      } else {
        if (data?.info?.relatedEvent === "null") {
          if (authCtx.user.regForm.includes(data.id)) {
            setBtnTxt("Already Registered");
          } else {
            if (remainingTime) {
              setBtnTxt(remainingTime);
            } else if (data?.info?.isRegistrationClosed) {
              setBtnTxt("Closed");
            } else {
              setBtnTxt("Register Now");
            }
          }
        } else {
          // setBtnTxt("Locked");
          if (authCtx.user.access === "USER") {
            if (data?.info?.isRegistrationClosed) {
              setBtnTxt("Closed");
            } else {
              setBtnTxt("Locked");
            }
          }
        }
      }
    }
  }, [
    authCtx.isLoggedIn,
    authCtx.user.regForm,
    data,
    info.isRegistrationClosed,
    info.isEventPast,
    isRegisteredInRelatedEvents,
    remainingTime,
  ]);

  const handleModalClose = () => {
    router.push(onClosePath);
  };

  const [isOpen, setOpen] = useState(false);

  const handleShare = () => {
    setOpen(!isOpen);
  };

  const handleForm = () => {
    if (authCtx.isLoggedIn) {
      setIsMicroLoading(true);
      if (authCtx.user.access !== "USER" && authCtx.user.access !== "ADMIN") {
        setTimeout(() => {
          setIsMicroLoading(false);
          setBtnTxt("Already Member");
        }, 1000);

        setAlert({
          type: "info",
          message: "Team Members are not allowed to register for the Event",
          position: "bottom-right",
          duration: 3000,
        });
      } else if (isBatchRegistrationBlocked(authCtx.user.email)) {
        setIsMicroLoading(false);
        setAlert({
          type: "info",
          message: batchRegistrationErrorMessage(),
          position: "bottom-right",
          duration: 4000,
        });
      } else {
        setNavigatePath("/Events/" + data?.id + "/Form");
        setTimeout(() => {
          setShouldNavigate(true);
        }, 3000);

        setTimeout(() => {
          setIsMicroLoading(false);
        }, 3000);

        setAlert({
          type: "info",
          message: "Opening Event Registration Form",
          position: "bottom-right",
          duration: 3000,
        });
      }
    } else {
      setIsMicroLoading(true);
      sessionStorage.setItem("prevPage", window.location.pathname);
      setNavigatePath("/login");

      setTimeout(() => {
        setShouldNavigate(true);
      }, 3000);

      setTimeout(() => {
        setIsMicroLoading(false);
      }, 3000);
    }
  };

  const url = window.location.href;

  return (
    <div
      style={{
        position: "fixed",
        width: "100%",
        height: "100%",

        zIndex: "10",

        left: "0",
        top: "0",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.5)",
          backdropFilter: "blur(4px)",
          zIndex: "5",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            zIndex: "10",
            borderRadius: "10px",
            padding: "2rem",
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginTop: ".3rem",
          }}
        >
          {data && (
            <>
              <SkeletonTheme baseColor="#313131" highlightColor="#525252">
                <Skeleton height={180} style={{ marginBottom: "1rem" }} />
                <Skeleton
                  count={3}
                  height={20}
                  width="100%"
                  style={{ marginBottom: "0.5rem" }}
                />
              </SkeletonTheme>
              <div className={EventCardModal.card}>
                {isLoading ? (
                  <ComponentLoading
                    customStyles={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "relative",
                    }}
                  >
                    <button
                      className={EventCardModal.closeModal}
                      onClick={handleModalClose}
                    >
                      <X />
                    </button>
                    <div className={EventCardModal.backimg}>
                      {/* {!info.eventImg===null? <img
                        src=  {info.eventImg}
                        className={EventCardModal.img}
                        alt="Event"
                      />:<img
                      src=  {eventDefaultImg}
                      className={EventCardModal.img}
                      alt="Event"
                    />} */}

                      {!imageLoaded && (
                        <Blurhash
                          style={{ borderRadius: "10px" }}
                          hash="LEG8_%els7NgM{M{RiNI*0IVog%L"
                          width={"100%"}
                          height={250}
                          resolutionX={32}
                          resolutionY={32}
                          punch={1}
                        />
                      )}
                      <img
                        srcSet={info.eventImg}
                        className={EventCardModal.img}
                        style={{
                          display: imageLoaded ? "block" : "none",
                        }}
                        alt="Event"
                        onLoad={() => setImageLoaded(true)}
                      />
                      <div className={EventCardModal.date}>{formattedDate}</div>
                      {info.ongoingEvent && (
                        <div
                          className={EventCardModal.share}
                          onClick={handleShare}
                        >
                          <img
                            className={EventCardModal.shareIcon}
                            src={shareOutline.src}
                            alt="Share"
                          />
                        </div>
                      )}
                    </div>
                    <div className={EventCardModal.backbtn}>
                      <div className={EventCardModal.eventname}>
                        {info.eventTitle}
                        {/*
                          A <div>, not a <p> — it contains `div.price`, which
                          contains a <p>. Same parser-reparenting hydration
                          mismatch EventCard had; `.meta` is listed alongside
                          `.eventname p` so the styling is unchanged.
                        */}
                        <div className={EventCardModal.meta}>
                          {info.participationType === "Team" ? (
                            <>
                              <MdGroups color="#f97507" size={25} />
                              <span
                                style={{
                                  color: "white",
                                  paddingRight: "2px",
                                  paddingLeft: "3px",
                                }}
                              >
                                {" "}
                                Team size:
                              </span>{" "}
                              {info.minTeamSize} - {info.maxTeamSize} {" | "}
                            </>
                          ) : (
                            <>
                              <FaUser color="#f97507" size={13} />
                              <span
                                style={{
                                  color: "white",
                                  paddingRight: "2px",
                                  paddingLeft: "3px",
                                }}
                              >
                                Individual
                              </span>
                              {" | "}
                            </>
                          )}
                          <div>
                            {info.eventAmount ? (
                              <p style={{ font: "2rem" }}>
                                <FaRupeeSign color="#f97507" size={15} />
                                {info.eventAmount}
                              </p>
                            ) : (
                              <p style={{ color: "white", marginTop: "-1px" }}>
                                Free
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={EventCardModal.registerbtn}>
                        <button
                          className={EventCardModal.registerbtn}
                          style={{
                            cursor:
                              btnTxt === "Register Now"
                                ? "pointer"
                                : "not-allowed",
                          }}
                          onClick={handleForm}
                          disabled={
                            btnTxt === "Closed" ||
                            btnTxt === "Already Registered" ||
                            btnTxt === "Already Member" ||
                            btnTxt === "Locked" ||
                            btnTxt === `${remainingTime}`
                          }
                        >
                          {btnTxt === "Closed" ? (
                            <>
                              <div style={{ fontSize: "0.85rem" }}>Closed</div>{" "}
                              <IoIosLock
                                alt=""
                                style={{
                                  marginLeft: "0px",
                                  fontSize: "1.2rem",
                                }}
                              />
                            </>
                          ) : btnTxt === "Already Registered" ? (
                            <>
                              <div style={{ fontSize: "0.85rem" }}>
                                Already Registered
                              </div>{" "}
                            </>
                          ) : btnTxt === "Locked" ? (
                            <>
                              <div style={{ fontSize: "0.9rem" }}>Locked</div>{" "}
                              <IoIosLock
                                alt=""
                                style={{ marginLeft: "0px", fontSize: "1rem" }}
                              />
                            </>
                          ) : isMicroLoading ? (
                            <div style={{ fontSize: "0.9rem" }}>
                              <MicroLoading />
                            </div>
                          ) : (
                            <>
                              {remainingTime ? (
                                <>
                                  <PiClockCountdownDuotone /> {btnTxt}
                                </>
                              ) : btnTxt === "Already Member" ? (
                                <>
                                  <div style={{ fontSize: "0.9rem" }}>
                                    Already Member
                                  </div>{" "}
                                </>
                              ) : (
                                "Register Now"
                              )}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className={EventCardModal.backtxt}>
                      <MarkdownContent>{info.eventdescription}</MarkdownContent>
                    </div>
                  </div>
                )}
              </div>
              {isOpen && <Share onClose={handleShare} urlpath={url} />}
            </>
          )}
        </div>
        {/* </div> */}
      </div>
      <Alert />
    </div>
  );
};

export default EventModal;