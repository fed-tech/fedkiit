"use client";

import React, { useState, useEffect, useContext } from "react";
import { X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import AuthContext from "../../../../context/AuthContext";
import { RecoveryContext } from "../../../../context/RecoveryContext";
import { api } from "../../../../services";
import style from "./styles/QRCodeModal.module.scss";

const QRCodeModal = ({ onClose, eventId }) => {
  const [qrCodeData, setQrCodeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expiresHint, setExpiresHint] = useState("");
  const authCtx = useContext(AuthContext);
  const recoveryCtx = useContext(RecoveryContext);

  const fetchAttendanceCode = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const teamCode = recoveryCtx.teamCode;
      let url = `/api/form/attendanceCode/${eventId}`;
      if (teamCode && teamCode.trim() !== "") {
        url += `?teamCode=${encodeURIComponent(teamCode)}`;
      }

      const token = localStorage.getItem("token");
      const response = await api.get(url, {
        headers: { Authorization: token },
      });

      if (response.status === 200) {
        setQrCodeData(response.data.attendanceToken);
        setExpiresHint("Valid for 20 minutes — show this screen at the check-in desk.");
      } else {
        throw new Error("Failed to fetch attendance code");
      }
    } catch (err) {
      const message = err?.response?.data?.message;
      const code = err?.response?.data?.errors?.[0]?.code;

      if (code === "BATCH_QR_BLOCKED") {
        setError(message || "Attendance QR is not available for your registration.");
        setQrCodeData(null);
      } else if (code === "ALREADY_MARKED" || message?.toLowerCase().includes("already marked")) {
        setError("You are already checked in for this event.");
        setQrCodeData(null);
      } else if (err?.response?.status === 401) {
        setError("Please log in again to show your QR code.");
      } else if (err?.response?.status === 403) {
        setError(message || "You are not registered for this event.");
      } else {
        setError(message || "Failed to generate QR code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceCode();
  }, [eventId]);

  return (
    <div className={style.qrContainer}>
      <div className={style.overlay} onClick={onClose} />
      <div className={style.maindiv}>
        <div className={style.header}>
          <div onClick={onClose} className={style.closebtn}>
            <X />
          </div>
          <div className={style.title}>Attendance QR Code</div>
        </div>

        <div className={style.content}>
          {isLoading ? (
            <div className={style.loadingContainer}>
              <div className={style.spinner} />
              <p>Generating QR Code...</p>
            </div>
          ) : error ? (
            <div className={style.errorContainer}>
              <p>{error}</p>
              <button type="button" onClick={fetchAttendanceCode} className={style.retryBtn}>
                Try Again
              </button>
            </div>
          ) : qrCodeData ? (
            <div className={style.qrContent}>
              <div className={style.qrWrapper}>
                <QRCodeSVG
                  value={qrCodeData}
                  size={220}
                  level="M"
                  className={style.qrCode}
                  includeMargin
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>

              <div className={style.codeInfo}>
                <p className={style.instruction}>
                  Show this QR code to event organizers at the check-in desk.
                </p>
                <p className={style.instructionMuted}>{expiresHint}</p>
                <p className={style.instructionMuted}>
                  After you are checked in, this code cannot be used again.
                </p>
              </div>
            </div>
          ) : (
            <div className={style.noCodeContainer}>
              <p>No attendance code available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
