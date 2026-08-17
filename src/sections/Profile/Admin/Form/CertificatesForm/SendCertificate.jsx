"use client";

import { useState, useEffect, useContext } from "react";

import { Button, Input } from "../../../../../components";
import { api } from "../../../../../services";
import * as XLSX from "xlsx";
import {
  getCertificatePreview,
  generatedAndSendCertificate,
  accessOrCreateEventByFormId,
  testCertificateSending,
} from "./tools/certificateTools";
import { Alert, MicroLoading } from "../../../../../microInteraction";
import AuthContext from "../../../../../context/AuthContext";
import { useParams } from "next/navigation";

const Checkbox = ({ id, checked, onCheckedChange }) => {
  return (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      style={{ width: 18, height: 18, accentColor: "#007bff" }}
    />
  );
};

const SendCertificate = ({ eventId: propEventId } = {}) => {
  const authCtx = useContext(AuthContext);
  const params = useParams();
  const routeEventId = params?.id ?? params?.eventId ?? params?.formId;
  const eventId = propEventId || routeEventId;
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingMail, setSendingMail] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [checkedAttendees, setCheckedAttendees] = useState([]);
  const [subject, setSubject] = useState("Certificate of Appreciation");
  const [body, setDescription] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [mailFrequency, setMailFrequency] = useState(20);
  const [uncheckedFilterText, setUncheckedFilterText] = useState("");
  const [checkedFilterText, setCheckedFilterText] = useState("");
  const [fileUploading, setFileUploading] = useState(false);
  const [certificatePreview, setCertificatePreview] = useState(null);
  const [alert, setAlert] = useState(null);
  const [failedEmails, setFailedEmails] = useState([]);
  const [deliveryError, setDeliveryError] = useState("");
  const [isFailedMinimized, setIsFailedMinimized] = useState(false);

  useEffect(() => {
    const fetchCertificatePreview = async () => {
      if (!eventId || eventId === "undefined" || eventId === "null") {
        setCertificatePreview(null);
        setAlert({
          type: "error",
          message: "Event ID is missing from this link.",
          position: "top-right",
          duration: 4000,
        });
        setPreviewLoading(false);
        return;
      }

      setPreviewLoading(true);
      try {
        const preview = await getCertificatePreview(eventId, authCtx.token);
        if (preview) {
          setCertificatePreview(preview);
        } else {
          setCertificatePreview(null);
          setAlert({
            type: "warning",
            message: "No certificate template has been saved for this event yet.",
            position: "top-right",
            duration: 4000,
          });
        }
      } catch (error) {
        setCertificatePreview(null);
        setAlert({
          type: "error",
          message:
            error.response?.data?.message ||
            "Failed to load certificate preview. Save a certificate template first.",
          position: "top-right",
          duration: 3000,
        });
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchCertificatePreview();
  }, [eventId]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      setAlert({
        type: "error",
        message: "Please upload an Excel file (.xlsx, .xls) or CSV file",
        position: "top-right",
        duration: 3000,
      });
      return;
    }

    setFileUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const extractedAttendees = jsonData.map((row) => {
          const email =
            row.email ||
            row.Email ||
            row.EMAIL ||
            row["Email Address"] ||
            row["email address"];
          const name =
            row.name ||
            row.Name ||
            row.NAME ||
            row["Full Name"] ||
            row["full name"];

          if (!email) {
            throw new Error("Email column not found in Excel sheet");
          }

          return {
            email: email.trim(),
            name: name ? name.trim() : "",
          };
        });

        setAttendees(extractedAttendees);
        setAlert({
          type: "success",
          message: `Successfully loaded ${extractedAttendees.length} attendees`,
          position: "top-right",
          duration: 3000,
        });
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      setAlert({
        type: "error",
        message: error.message || "Failed to process Excel file",
        position: "top-right",
        duration: 3000,
      });
    } finally {
      setFileUploading(false);
    }
  };

  useEffect(() => {
    if (alert) {
      Alert(alert);
      setAlert(null);
    }
  }, [alert]);

  const handleCheckAttendee = (attendee) => {
    setCheckedAttendees((prev) => [...prev, attendee]);
  };

  const handleUncheckAttendee = (attendee) => {
    setCheckedAttendees((prev) =>
      prev.filter((a) => a.email !== attendee.email)
    );
  };

  const handleSelectAllUnchecked = () => {
    setCheckedAttendees([...attendees]);
    setAlert({
      type: "success",
      message: "All attendees selected",
      position: "top-right",
      duration: 2000,
    });
  };

  const handleDeselectAllUnchecked = () => {
    setCheckedAttendees([]);
    setAlert({
      type: "info",
      message: "All attendees deselected",
      position: "top-right",
      duration: 2000,
    });
  };

  useEffect(() => {
    setRecipientEmail(
      checkedAttendees.map((attendee) => attendee.email).join(", ")
    );
  }, [checkedAttendees]);

  const filteredAttendees = attendees.filter(
    (attendee) =>
      attendee.email
        .toLowerCase()
        .includes(uncheckedFilterText.toLowerCase()) ||
      (attendee.name &&
        attendee.name.toLowerCase().includes(uncheckedFilterText.toLowerCase()))
  );

  const filteredCheckedAttendees = checkedAttendees.filter(
    (attendee) =>
      attendee.email.toLowerCase().includes(checkedFilterText.toLowerCase()) ||
      (attendee.name &&
        attendee.name.toLowerCase().includes(checkedFilterText.toLowerCase()))
  );
  const handleSendBatchMail = async () => {
    if (!eventId) {
      setAlert({
        type: "error",
        message: "Event ID is missing. Please open this page from the certificate list.",
        position: "top-right",
        duration: 4000,
      });
      return;
    }

    if (!checkedAttendees.length) {
      setAlert({
        type: "warning",
        message: "Please select at least one recipient",
        position: "top-right",
        duration: 3000,
      });
      return;
    }

    setSendingMail(true);
    setFailedEmails([]);
    setDeliveryError("");

    try {
      if (!eventId) {
        throw new Error("Event ID is missing");
      }

      const attendees = checkedAttendees.map((attendee) => ({
        email: attendee.email,
        name: attendee.name || "",
      }));

      if (attendees.length === 0) {
        throw new Error("No valid attendees found");
      }
      const response = await generatedAndSendCertificate({
        eventId,
        attendees,
        subject,
        body,
        token: authCtx.token,
      });

      if (response?.status === 200) {
        setAlert({
          type: "success",
          message: response.data?.message || "All certificates sent successfully!",
          position: "top-right",
          duration: 4000,
        });
      } else if (response?.status === 207) {
        const failed = response.data?.failed || [];
        setFailedEmails(failed);
        setAlert({
          type: "warning",
          message: response.data?.message || "Some certificates failed to send.",
          position: "top-right",
          duration: 5000,
        });
      } else {
        throw new Error(response?.data?.error || "Failed to send certificates");
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      setDeliveryError(message);
      console.error("Error in handleSendBatchMail:", error);
      setAlert({
        type: "error",
        message: "Failed to send certificates: " + message,
        position: "top-right",
        duration: 3000,
      });
    } finally {
      setSendingMail(false);
    }
  };

  const handleTestMail = async () => {
    if (!eventId) {
      setAlert({
        type: "error",
        message: "Event ID is missing. Please open this page from the certificate list.",
        position: "top-right",
        duration: 4000,
      });
      return;
    }

    if (!checkedAttendees.length) {
      setAlert({
        type: "warning",
        message: "Please select at least one recipient for test mail",
        position: "top-right",
        duration: 3000,
      });
      return;
    }

    setSendingMail(true);
    setDeliveryError("");
    try {
      if (!eventId) {
        throw new Error("Event ID is missing");
      }

      const response = await testCertificateSending({
        eventId,
        email: checkedAttendees[0].email,
        name: checkedAttendees[0].name || "",
        subject: `[TEST] ${subject}`,
        token: authCtx.token,
      });

      if (response && response.status === 200) {
        setAlert({
          type: "success",
          message: "Test mail sent successfully!",
          position: "top-right",
          duration: 3000,
        });
      } else {
        throw new Error(
          response?.data?.message ||
            response?.data?.error ||
            "Failed to send test mail"
        );
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      setDeliveryError(message);
      setAlert({
        type: "error",
        message:
          "Failed to send test mail: " +
          message,
        position: "top-right",
        duration: 3000,
      });
    } finally {
      setSendingMail(false);
    }
  };

  return (
    <div style={{ marginLeft: "5%", marginRight: "5%", marginTop: "30px" }}>
      <h1
        style={{
          textAlign: "center",
          marginBottom: "30px",
          marginTop: "-30px",
        }}
      >
        Send <span style={{ color: "#FF8A00" }}>Certificate</span>
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 20 }}>
          <div
            style={{
              flex: 1,
              padding: 20,
              border: "1px solid #ccc",
              borderRadius: 10,
              height: 300,
              objectFit: "cover",
              position: "relative",
              overflow: "hidden",
              maxWidth: "800px",
            }}
          >
            {previewLoading ? (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <MicroLoading />
              </div>
            ) : certificatePreview ? (
              <img
                src={certificatePreview}
                alt="Certificate Preview"
                style={{
                  width: "98%",
                  borderRadius: 10,
                  objectFit: "cotain",
                  maxHeight: "270px",
                }}
              />
            ) : (
              <p style={{ textAlign: "center", marginTop: 120 }}>
                No certificate template found. Save one from Create Certificate first.
              </p>
            )}
          </div>
          <div
            style={{
              flex: 1,
              padding: 20,
              border: "1px solid #ccc",
              borderRadius: 10,
              overflowY: "auto",
              height: 300,
            }}
          >
            <h3 style={{ marginLeft: "5px" }}>Unchecked Attendees</h3>
            <Input
              type="text"
              placeholder="Filter Unchecked"
              value={uncheckedFilterText}
              onChange={(e) => setUncheckedFilterText(e.target.value)}
              style={{ width: "100%", marginTop: "-10px" }}
            />
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: -10,
                marginLeft: "5px",
              }}
            >
              <Button onClick={handleSelectAllUnchecked}>Select All</Button>
              <Button onClick={handleDeselectAllUnchecked}>Deselect All</Button>
            </div>
            <div
              style={{
                maxHeight: "100px",
                overflowY: "auto",
                border: "1px solid #ccc",
                borderRadius: "5px",
                padding: "10px",
                marginTop: "10px",
                marginLeft: "8px",
                position: "relative",
              }}
            >
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100px",
                  }}
                >
                  <MicroLoading />
                </div>
              ) : filteredAttendees.length > 0 ? (
                filteredAttendees.map((attendee) => (
                  <div
                    key={attendee.email}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <Checkbox
                      checked={checkedAttendees.some(
                        (a) => a.email === attendee.email
                      )}
                      onCheckedChange={() =>
                        checkedAttendees.some((a) => a.email === attendee.email)
                          ? handleUncheckAttendee(attendee)
                          : handleCheckAttendee(attendee)
                      }
                    />
                    <label>
                      {attendee.name
                        ? `${attendee.name} (${attendee.email})`
                        : attendee.email}
                    </label>
                  </div>
                ))
              ) : (
                <p>No unchecked attendees.</p>
              )}
            </div>
            <div style={{ marginBottom: 20 }}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                style={{ display: "none" }}
                id="excel-upload"
                onClick={(e) => {
                  e.target.value = null;
                }}
              />
              <label htmlFor="excel-upload">
                <Button
                  as="span"
                  disabled={fileUploading}
                  style={{ cursor: "pointer", marginLeft: "6px" }}
                  onClick={() => {
                    document.getElementById("excel-upload").click();
                  }}
                >
                  {fileUploading ? <MicroLoading /> : "Upload Excel/CSV"}
                </Button>
              </label>
              <span style={{ marginLeft: 9, color: "#666" }}>
                Upload Excel/CSV file containing attendee details
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: 20,
            border: "1px solid #ccc",
            borderRadius: 10,
            maxHeight: "330px",
            overflowY: "auto",
            width: "50%",
            overflowX: "hidden",
          }}
        >
          <h3 style={{ marginLeft: "5px" }}>Checked Attendees</h3>
          <Input
            type="text"
            placeholder="Filter Checked"
            value={checkedFilterText}
            onChange={(e) => setCheckedFilterText(e.target.value)}
            style={{ width: "100%", marginTop: "-10px" }}
          />
          <div
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              border: "1px solid #ccc",
              borderRadius: "5px",
              padding: "10px",
              marginTop: "10px",
              marginLeft: "7px",
              width: "100%",
            }}
          >
            {checkedAttendees.length > 0 ? (
              filteredCheckedAttendees.map((attendee) => (
                <p key={attendee.email}>
                  {attendee.name
                    ? `${attendee.name} (${attendee.email})`
                    : attendee.email}
                </p>
              ))
            ) : (
              <p>No checked attendees.</p>
            )}
          </div>

          <h3 style={{ marginLeft: "5px", marginTop: "10px" }}>
            Recipient Email
          </h3>
          <Input
            type="email"
            placeholder="Emails will be added here"
            value={recipientEmail}
            readOnly
            style={{ width: "100%", marginTop: "-10px" }}
          />

          <h3 style={{ marginLeft: "5px" }}>Subject</h3>
          <Input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{ width: "100%", marginTop: -10 }}
          />

          <h3 style={{ marginLeft: "5px" }}>Description</h3>
          <Input
            type="text"
            placeholder="Description"
            value={body}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: "100%",
              height: 80,
              marginTop: -10,
            }}
          />

          <h3 style={{ marginLeft: "5px" }}>Mail Frequency</h3>
          <Input
            type="number"
            placeholder="Set mail frequency"
            value={mailFrequency}
            onChange={(e) => setMailFrequency(e.target.value)}
            style={{ marginTop: -10, width: "100%" }}
          />
          {deliveryError && (
            <p
              role="alert"
              style={{ color: "#ff6b6b", margin: "10px 5px 0", lineHeight: 1.4 }}
            >
              {deliveryError}
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: -10,
              marginLeft: "5px",
              position: "relative",
            }}
          >
            <Button onClick={handleTestMail} disabled={sendingMail}>
              {sendingMail ? <MicroLoading /> : "Test Mail"}
            </Button>
            <Button onClick={handleSendBatchMail} disabled={sendingMail}>
              {sendingMail ? <MicroLoading /> : "Send Mail"}
            </Button>
          </div>
        </div>

        {failedEmails.length > 0 && (
          <div
            style={{
              padding: 20,
              border: "1px solid #e74c3c",
              borderRadius: 10,
              backgroundColor: "rgba(231, 76, 60, 0.08)",
              marginTop: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: isFailedMinimized ? 0 : 10,
              }}
            >
              <h3 style={{ color: "#e74c3c", margin: 0 }}>
                ⚠ Failed Emails ({failedEmails.length})
              </h3>
              <div style={{ display: "flex", gap: 10 }}>
                <Button
                  onClick={() => setIsFailedMinimized((prev) => !prev)}
                  style={{ backgroundColor: "transparent", color: "#e74c3c", fontSize: "0.85em" }}
                >
                  {isFailedMinimized ? "▼ Expand" : "▲ Minimize"}
                </Button>
                <Button
                  onClick={() => {
                    const failedAttendeeEmails = failedEmails.map((f) => f.email);
                    const failedAttendees = failedAttendeeEmails
                      .map((email) => {
                        const existing = attendees.find((a) => a.email === email);
                        return existing || { email, name: "" };
                      })
                      .filter(
                        (fa) =>
                          !checkedAttendees.some((ca) => ca.email === fa.email)
                      );
                    setCheckedAttendees((prev) => [...prev, ...failedAttendees]);
                    setAlert({
                      type: "info",
                      message: `${failedAttendees.length} failed recipient(s) added back for retry`,
                      position: "top-right",
                      duration: 3000,
                    });
                  }}
                >
                  Retry Failed
                </Button>
                <Button
                  onClick={() => setFailedEmails([])}
                  style={{ backgroundColor: "transparent", color: "#e74c3c" }}
                >
                  Dismiss
                </Button>
              </div>
            </div>
            {!isFailedMinimized && (
              <div
                style={{
                  maxHeight: 200,
                  overflowY: "auto",
                  border: "1px solid rgba(231, 76, 60, 0.3)",
                  borderRadius: 5,
                  padding: 10,
                }}
              >
                {failedEmails.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom:
                        idx < failedEmails.length - 1
                          ? "1px solid rgba(231, 76, 60, 0.15)"
                          : "none",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{item.email}</span>
                    <span
                      style={{
                        color: "#e74c3c",
                        fontSize: "0.85em",
                        maxWidth: "50%",
                        textAlign: "right",
                      }}
                    >
                      {item.error || "Unknown error"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SendCertificate;
