import Link from "next/link";

export default function Page({ params }: { params: { id: string } }) {
  const id = params?.id;
  return (
    <main style={{ padding: 24 }}>
      <h1>Create/Edit Certificates</h1>
      <p>Event id: <strong>{id}</strong></p>
      <p>This is a placeholder page. Replace with your certificate editor UI.</p>
      <p>
        <Link href="/profile/certificates">Back to Certificates list</Link>
      </p>
    </main>
  );
}