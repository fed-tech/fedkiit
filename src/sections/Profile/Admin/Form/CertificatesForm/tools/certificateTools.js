"use client";

import { api } from "../../../../../../services";
// import AuthContext from "../../../../../../context/AuthContext";
// import { useContext } from "react";

// The app routes already carry the real Event id in the URL. The old
// getEventByFormId/createOrganisationEvent flow does not exist in the migrated
// Next.js backend, so prefer the direct eventId path instead of creating an
// intermediate form-based lookup.
const accessOrCreateEventByFormId = async (formId, token) => {
  try {
    if (!formId) return null;
    return { id: formId, certificates: [{ id: formId }] };
  } catch (error) {
    console.error("Error resolving event id:", error);
    return null;
  }
};

const getCertificatePreview = async (formId, token) => {
  try {
    if (!formId) {
      console.warn("No event id was provided for certificate preview");
      return null;
    }

    const cert = await api.post(
      "/api/certificate/dummyCertificate",
      {
        eventId: formId,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return cert?.data?.template ?? cert?.data?.imageSrc ?? null;
  } catch (error) {
    console.error("Error fetching certificate preview:", error);
    return null;
  }
};

const sendBatchMail = async ({ formId, subject, htmlContent, token }) => {
  try {
    const response = await api.post(
      "/api/certificate/sendBatchMails",
      {
        batchSize: 10,
        formId,
        subject,
        htmlContent,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log(response.data);
  } catch (error) {
    console.error("Error sending batch mail:", error);
  }
};

const generatedAndSendCertificate = async ({
  eventId,
  attendees,
  subject,
  body,
  token,
}) => {
  try {
    const recipients = (attendees ?? []).map((attendee) => ({
      email: attendee.email,
      fieldValues: {
        name: attendee.name || attendee.email,
        email: attendee.email,
        subject: subject || "Certificate of Appreciation",
        body: body || "",
      },
    }));

    const response = await api.post(
      "/api/certificate/sendCertificatesAndEvents",
      {
        eventId,
        recipients,
        resend: true,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.status === 200) {
      console.log("Certificates generated and sent successfully!");
    } else {
      console.error("Error:", response.data);
    }
    return response;
  } catch (error) {
    console.error("Failed to generate and send certificates:", error);
    return error?.response ?? { status: 500, data: { message: "Failed to send certificates" } };
  }
};

const testCertificateSending = async ({ eventId, email, name, subject, token }) => {
  try {
    const response = await api.post(
      "/api/certificate/testCertificateSending",
      {
        eventId,
        email,
        name,
        subject,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response;
  } catch (error) {
    console.warn("Test certificate was not sent:", error.response?.data?.message);
    return error.response;
  }
};

export {
  accessOrCreateEventByFormId,
  getCertificatePreview,
  sendBatchMail,
  generatedAndSendCertificate,
  testCertificateSending,
};
