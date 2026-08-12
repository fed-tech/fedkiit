import { prisma } from "@/lib/db";
import styles from "./SocialFeed.module.scss";

// Server component: pulls visible social posts from the DB and lays them out
// in side-by-side columns (flex-wrap); each card stacks vertically.
// Styled via SCSS module — Tailwind is not loaded in this project.
export default async function SocialFeed() {
  const posts = await prisma.socialPost.findMany({
    where: { isVisible: true },
    orderBy: { createdAt: "desc" },
  });

  if (posts.length === 0) {
    return <p className={styles.empty}>No social posts to show yet.</p>;
  }

  return (
    <section className={styles.feed}>
      {posts.map((post) => (
        <div key={post.id} className={styles.card}>
          {post.platform === "instagram" ? (
            <iframe
              src={post.embedUrl}
              className={styles.embed}
              scrolling="no"
              allow="encrypted-media"
              title={`Instagram post${post.caption ? ": " + post.caption : ""}`}
            />
          ) : post.platform === "linkedin" ? (
            <iframe
              src={post.embedUrl}
              className={styles.embedLinkedin}
              scrolling="no"
              allow="encrypted-media"
              title={`LinkedIn post${post.caption ? ": " + post.caption : ""}`}
            />
          ) : null}
          {post.caption && <p className={styles.caption}>{post.caption}</p>}
        </div>
      ))}
    </section>
  );
}
