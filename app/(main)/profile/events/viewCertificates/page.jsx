import Link from "next/link";

export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Certificate viewer</h1>
      <p>Select an event from the certificate list to view its generated files.</p>
      <Link href="/profile/certificates">Back to Certificates</Link>
    </main>
  );
}
