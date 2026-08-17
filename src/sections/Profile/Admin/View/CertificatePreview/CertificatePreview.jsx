"use client";

import { useState, useEffect, useContext } from "react";

import { Button } from "../../../../../components";
import { Input } from "../../../../../components";
import { api } from "../../../../../services";
import styles from "./styles/CertificatePreview.module.scss";
import { getCertificatePreview } from "../../Form/CertificatesForm/tools/certificateTools";
import { MicroLoading } from "../../../../../microInteraction";
import { accessOrCreateEventByFormId } from "../../Form/CertificatesForm/tools/certificateTools";
import AuthContext from "../../../../../context/AuthContext";
import { useRouter, useParams } from "next/navigation";

const CertificatesPreview = () => {
  const authCtx = useContext(AuthContext);
  const params = useParams();
  const eventId = params?.id ?? params?.eventId ?? params?.formId;
  const eventTitle = params?.eventTitle ?? "Event Name";
  const router = useRouter();
  const [certificateData, setCertificateData] = useState({});
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Lorem");
  const [description, setDescription] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [certificatePreview, setCertificatePreview] = useState(
    "https://via.placeholder.com/600x300/ff6347/ffffff?text=Certificate+Preview"
  );

  useEffect(() => {
    const fetchCertificatePreview = async () => {
      setPreviewLoading(true);

      try {
        // console.log(authCtx);
        const preview = await getCertificatePreview(eventId, authCtx.token);
        if (preview) {
          setCertificatePreview(preview);
          setCertificateData({
            subject: "",
            description: "",
            recipientEmail: "",
            name: "",
          });
        }
      } catch (error) {
        console.error("Failed to load certificate preview:", error);
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchCertificatePreview();
  }, [eventId]);

  const handleSendTestMail = async () => {
    if (!recipientEmail) {
      alert("Please enter a recipient email.");
      return;
    }

    setLoading(true);
    try {
      const eventData = await accessOrCreateEventByFormId(
        eventId,
        authCtx.token
      );
      const response = await api.post(
        "/api/certificate/testCertificateSending",
        {
          eventId: eventData.id,
          name,
          subject,
          email: recipientEmail,
        },
        {
          headers: { Authorization: `Bearer ${authCtx.token}` },
        }
      );

      alert(response.data.message);
    } catch (error) {
      console.error("Error sending test mail:", error);
      alert("Failed to send test mail.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "800px",
        margin: "0 auto",
        border: "1px solid #ccc",
        borderRadius: "10px",
        overflowY: "auto",
        height: "90vh",
      }}
    >
      <h1 style={{ textAlign: "center" }}>
        {eventTitle || "Event Name"} Certificate{" "}
        <span style={{ color: "#FF8A00" }}>Preview</span>
      </h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: "20px",
        }}
      >
        {previewLoading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "20px",
              width: "100%",
              height: "450px",
              border: "1px solid #ccc",
              borderRadius: "10px",
              position: "relative",
              justifyContent: "center",
            }}
          >
            <MicroLoading />
          </div>
        ) : (
          <img
            src={certificatePreview}
            alt="Certificate Preview"
            style={{ width: "100%", height: "auto", borderRadius: 10 }}
          />
        )}

        <div style={{ width: "100%", marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginTop: "20px",
              marginLeft: "6px",
            }}
          >
            Recipient Name:
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", marginBottom: "20px", marginTop: "-10px" }}
          />

          <label
            style={{
              display: "block",
              fontWeight: "bold",
              marginTop: "20px",
              marginLeft: "6px",
            }}
          >
            Subject:
          </label>
          <Input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{ width: "100%", marginBottom: "20px", marginTop: "-10px" }}
          />

          <div
            className={styles.info}
            style={{
              justifyContent: "center",
              width: "100%",
              marginTop: "20px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "bold",
                  marginLeft: "6px",
                }}
              >
                Description:
              </label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: "100%",
                  marginBottom: "20px",
                  marginTop: "-10px",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: "bold",
                  marginLeft: "6px",
                }}
              >
                Recipient’s Email ID:
              </label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  marginTop: "-10px",
                }}
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleSendTestMail}
          style={{
            padding: "10px 20px",
            borderRadius: "5px",
            marginTop: "-10px",
          }}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Test Mail"}
        </Button>
      </div>
    </div>
  );
};

export default CertificatesPreview;
