import fs from "fs";
import path from "path";
import Link from "next/link";

function getCertificates(eventId) {
  const certDir = path.join(process.cwd(), "public", "certificates", eventId);

  if (!fs.existsSync(certDir)) {
    return [];
  }

  return fs
    .readdirSync(certDir)
    .filter((file) => /\.(png|jpe?g|pdf)$/i.test(file))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({
      name: file,
      url: `/certificates/${eventId}/${file}`,
      isImage: /\.(png|jpe?g)$/i.test(file),
    }));
}

export default async function Page({ params }) {
  const { id } = await params;
  const certificates = getCertificates(id);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/profile/certificates">← Back to Certificates</Link>
      </div>

      <h1 style={{ marginBottom: 8 }}>Certificates for event</h1>
      <p style={{ marginTop: 0, marginBottom: 24 }}>
        Event ID: <strong>{id}</strong>
      </p>

      {certificates.length === 0 ? (
        <div
          style={{
            padding: 20,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#fff7ed",
          }}
        >
          No certificates have been generated for this event yet.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {certificates.map((certificate) => (
            <div
              key={certificate.name}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
                background: "#fff",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 12 }}>{certificate.name}</h3>

              {certificate.isImage ? (
                <img
                  src={certificate.url}
                  alt={certificate.name}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: 700,
                    borderRadius: 8,
                    border: "1px solid #f1f5f9",
                  }}
                />
              ) : (
                <a href={certificate.url} target="_blank" rel="noreferrer">
                  Open PDF
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
