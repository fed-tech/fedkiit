"use client";

import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import { Html5Qrcode } from "html5-qrcode";
import { EventCard } from "../../components";
import { Button } from "../../components/Core";
import AuthContext from "../../context/AuthContext";
import { api } from "../../services";
import styles from "./styles/AttendancePage.module.scss";
import { IoClose } from "react-icons/io5";
import { FaDownload } from "react-icons/fa";
import { showAlert, ComponentLoading } from "../../microInteraction";

const STATS_POLL_MS = 15000;
const API_TIMEOUT_MS = 15000;

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const priorityA = parseInt(a.info?.eventPriority ?? "99", 10);
    const priorityB = parseInt(b.info?.eventPriority ?? "99", 10);
    const dateA = new Date(a.info?.eventDate ?? 0);
    const dateB = new Date(b.info?.eventDate ?? 0);
    const titleA = a.info?.eventTitle || "";
    const titleB = b.info?.eventTitle || "";

    if (priorityA !== priorityB) return priorityA - priorityB;
    if (dateA.getTime() !== dateB.getTime()) return dateA - dateB;
    return titleA.localeCompare(titleB);
  });
}

function errorCode(error) {
  const errors = error?.response?.data?.errors;
  return Array.isArray(errors) ? errors[0]?.code : undefined;
}

function isNetworkError(error) {
  return !error?.response && Boolean(error?.message);
}

const AttendancePage = () => {
  const [ongoingEvents, setOngoingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [eventStats, setEventStats] = useState({ registered: 0, present: 0 });

  const authCtx = useContext(AuthContext);
  const processingRef = useRef(false);
  const closingRef = useRef(false);
  const html5QrRef = useRef(null);
  const selectedEventIdRef = useRef(null);
  const showScannerRef = useRef(false);
  const authTokenRef = useRef(authCtx.token);

  authTokenRef.current = authCtx.token;
  selectedEventIdRef.current = selectedEventId;
  showScannerRef.current = showScanner;

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${authTokenRef.current}` }),
    [],
  );

  const fetchEventStats = useCallback(
    async (eventId) => {
      if (!eventId) return;
      try {
        const response = await api.get(`/api/form/attendance-stats/${eventId}`, {
          headers: authHeaders(),
          timeout: API_TIMEOUT_MS,
        });
        if (response.status === 200) {
          setEventStats({
            registered: response.data.registered ?? 0,
            present: response.data.present ?? 0,
          });
        }
      } catch {
        // Non-blocking.
      }
    },
    [authHeaders],
  );

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get("/api/form/attendance-events", {
          headers: authHeaders(),
          timeout: API_TIMEOUT_MS,
        });
        if (response.status === 200) {
          const sorted = sortEvents(response.data.events ?? []);
          setOngoingEvents(sorted.filter((e) => !e.info?.isEventPast));
          setPastEvents(
            sorted
              .filter((e) => e.info?.isEventPast)
              .sort(
                (a, b) =>
                  new Date(b.info?.eventDate ?? 0) -
                  new Date(a.info?.eventDate ?? 0),
              ),
          );
        } else {
          setError("Error fetching events");
        }
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Error fetching events");
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, [authHeaders]);

  const pauseScanner = async () => {
    const scanner = html5QrRef.current;
    if (!scanner?.isScanning) return;
    try {
      await scanner.pause(true);
    } catch {
      // Some browsers reject pause; processingRef still guards duplicates.
    }
  };

  const resumeScanner = async () => {
    if (!showScannerRef.current || closingRef.current) return;
    const scanner = html5QrRef.current;
    if (!scanner?.isScanning) return;
    try {
      await scanner.resume();
    } catch {
      // Ignore resume failures; admin can close and reopen.
    }
  };

  const stopScanner = useCallback(async () => {
    const scanner = html5QrRef.current;
    if (!scanner) return;
    html5QrRef.current = null;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch (err) {
      console.warn("Scanner stop:", err);
    }
  }, []);

  const closeScanner = useCallback(async () => {
    closingRef.current = true;
    await stopScanner();
    setShowScanner(false);
    setSelectedEventId(null);
    setSelectedEventTitle("");
    closingRef.current = false;
  }, [stopScanner]);

  const onScanSuccess = async (decodedText) => {
    const token = decodedText?.trim();
    const eventId = selectedEventIdRef.current;

    if (!token || processingRef.current || closingRef.current || !eventId) return;

    processingRef.current = true;
    setIsScanning(true);
    await pauseScanner();

    try {
      const response = await api.post(
        "/api/form/markAttendance",
        { formId: eventId, token },
        { headers: authHeaders(), timeout: API_TIMEOUT_MS },
      );

      const { alreadyMarked } = response.data ?? {};

      if (alreadyMarked) {
        showAlert({
          type: "info",
          id: "attendance-already-checked-in",
          message: "Already checked in",
          position: "top-right",
          duration: 3000,
        });
        await fetchEventStats(eventId);
        await resumeScanner();
        return;
      }

      await fetchEventStats(eventId);
      showAlert({
        type: "success",
        id: "attendance-marked-success",
        message: "Attendance marked successfully!",
        position: "top-right",
        duration: 3000,
      });
      await closeScanner();
    } catch (err) {
      console.error("Error marking attendance:", err);
      const code = errorCode(err);
      const apiMessage = err.response?.data?.message;
      let errorMessage = apiMessage || "Failed to verify QR code";

      if (isNetworkError(err)) {
        errorMessage = "Network error — check your connection and try again";
      } else if (err.response?.status === 401) {
        if (apiMessage === "Token is required") {
          errorMessage = "Your session expired — please log in again";
          await closeScanner();
          showAlert({ type: "error", message: errorMessage, position: "top-right" });
          return;
        }
        errorMessage = apiMessage || "Invalid or expired QR code";
      } else if (code === "INVALID_QR") {
        errorMessage = "Invalid or expired QR code";
      } else if (code === "WRONG_EVENT") {
        errorMessage = "This QR belongs to a different event";
      } else if (code === "CONFLICT") {
        errorMessage = "Could not mark attendance — scan again";
      } else if (err.response?.status === 403) {
        errorMessage = "You don't have permission to mark attendance";
      } else if (err.response?.status === 404) {
        errorMessage = "Attendance record not found";
      }

      showAlert({
        type: "error",
        id: `attendance-scan-error-${code || err.response?.status || "network"}`,
        message: errorMessage,
        position: "top-right",
      });
      await resumeScanner();
    } finally {
      setIsScanning(false);
      processingRef.current = false;
    }
  };

  const onScanFailure = () => {};

  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;

  const startScanner = useCallback(async () => {
    if (html5QrRef.current || closingRef.current) return;
    if (!document.getElementById("qr-reader")) return;

    try {
      const html5Qr = new Html5Qrcode("qr-reader", { verbose: false });
      html5QrRef.current = html5Qr;
      await html5Qr.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1,
          disableFlip: false,
        },
        (text) => onScanSuccessRef.current(text),
        onScanFailure,
      );
    } catch (err) {
      console.error("Error initializing scanner:", err);
      showAlert({
        type: "error",
        message: "Could not access the camera. Check permissions and retry.",
        position: "top-right",
      });
      setShowScanner(false);
    }
  }, []);

  useEffect(() => {
    if (!showScanner) {
      stopScanner();
      return;
    }

    const timer = setTimeout(() => {
      startScanner();
      fetchEventStats(selectedEventId);
    }, 200);

    const statsInterval = setInterval(() => {
      fetchEventStats(selectedEventId);
    }, STATS_POLL_MS);

    return () => {
      clearTimeout(timer);
      clearInterval(statsInterval);
      stopScanner();
    };
  }, [showScanner, selectedEventId, startScanner, stopScanner, fetchEventStats]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleScanQR = (event) => {
    if (!authTokenRef.current) {
      showAlert({
        type: "error",
        message: "Please log in to mark attendance",
        position: "top-right",
      });
      return;
    }

    closingRef.current = false;
    processingRef.current = false;
    setSelectedEventId(event.id);
    setSelectedEventTitle(event.info?.eventTitle || "Event");
    setEventStats({ registered: 0, present: 0 });
    setShowScanner(true);
  };

  const handleDownloadAttendance = async (eventId) => {
    try {
      const response = await api.get(`/api/form/export-attendance/${eventId}`, {
        headers: authHeaders(),
        responseType: "blob",
        timeout: API_TIMEOUT_MS,
      });
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attendance_${eventId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showAlert({
        type: "success",
        message: "Attendance file downloaded",
        position: "top-right",
      });
    } catch (err) {
      let errorMessage = "Failed to download attendance file";
      if (isNetworkError(err)) {
        errorMessage = "Network error — could not download file";
      } else if (err.response?.status === 403) {
        errorMessage = "You don't have permission to download attendance data";
      } else if (err.response?.status === 404) {
        errorMessage = "Attendance data not found for this event";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      showAlert({ type: "error", message: errorMessage, position: "top-right" });
    }
  };

  const renderOngoingActions = (event) => (
    <div className={styles.actionButtons}>
      <Button onClick={() => handleScanQR(event)} variant="primary">
        Scan QR
      </Button>
      <Button
        onClick={() => handleDownloadAttendance(event.id)}
        variant="secondary"
        style={{
          padding: "8px 16px",
          backgroundColor: "rgba(255, 138, 0, 0.9)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <FaDownload size={18} />
        Attendance
      </Button>
    </div>
  );

  const renderPastActions = (event) => (
    <div className={styles.actionButtons}>
      <Button
        onClick={() => handleDownloadAttendance(event.id)}
        variant="secondary"
        style={{ padding: "8px 16px", backgroundColor: "rgba(255, 138, 0, 0.9)" }}
      >
        <FaDownload size={18} />
        Attendance
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <ComponentLoading
        customStyles={{
          width: "100%",
          height: "100%",
          display: "flex",
          marginTop: "10rem",
          marginBottom: "10rem",
          justifyContent: "center",
          alignItems: "center",
        }}
      />
    );
  }

  if (error) {
    return <div className={styles.errorState}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <h2>Event Attendance</h2>

      {showScanner && (
        <div className={styles.scannerModal}>
          <div className={styles.scannerContent}>
            <button
              type="button"
              className={styles.closeButton}
              onClick={closeScanner}
              aria-label="Close scanner"
            >
              <IoClose />
            </button>
            <h3 className={styles.scannerTitle}>{selectedEventTitle}</h3>
            <p className={styles.scannerStats}>
              Checked in: {eventStats.present} / {eventStats.registered}
            </p>
            <div className={styles.scannerArea}>
              {isScanning && (
                <div className={styles.scanningOverlay}>
                  <div className={styles.scanningText}>Verifying…</div>
                </div>
              )}
              <div id="qr-reader" />
            </div>
          </div>
        </div>
      )}

      {ongoingEvents.length > 0 && (
        <>
          <h3>Ongoing Events</h3>
          <div className={styles.eventGrid}>
            {ongoingEvents.map((event) => (
              <div key={event.id} className={styles.eventWrapper}>
                <EventCard
                  data={event}
                  type="ongoing"
                  isLoading={false}
                  showRegisterButton={false}
                  showShareButton={false}
                  additionalContent={renderOngoingActions(event)}
                  onOpen={() => {}}
                  customStyles={{
                    eventname: { fontSize: "1.2rem" },
                    registerbtn: { width: "8rem", fontSize: ".721rem" },
                    eventnamep: { fontSize: "0.7rem" },
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {pastEvents.length > 0 && (
        <>
          <h3 style={{ marginTop: "2rem" }}>Past Events</h3>
          <div className={styles.eventGrid}>
            {pastEvents.map((event) => (
              <div key={event.id} className={styles.eventWrapper}>
                <EventCard
                  data={event}
                  type="past"
                  isLoading={false}
                  showRegisterButton={false}
                  showShareButton={false}
                  additionalContent={renderPastActions(event)}
                  onOpen={() => {}}
                  customStyles={{
                    eventname: { fontSize: "1.2rem" },
                    registerbtn: { width: "8rem", fontSize: ".721rem" },
                    eventnamep: { fontSize: "0.7rem" },
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AttendancePage;
