import { prisma } from "@/lib/db";
import styles from "./BlogFeed.module.scss";

// Server component: public blogs as cards in side-by-side columns.
// Styled via SCSS module — Tailwind is not loaded in this project.
export default async function BlogFeed() {
  const blogs = await prisma.blog.findMany({
    where: { visibility: "public" },
    orderBy: { date: "desc" },
  });

  if (blogs.length === 0) {
    return <p className={styles.empty}>No blogs to show yet.</p>;
  }

  return (
    <section className={styles.feed}>
      {blogs.map((blog) => (
        <a
          key={blog.id}
          href={blog.blogLink || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.card}
        >
          {blog.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blog.image}
              alt={blog.title || "Blog image"}
              className={styles.image}
            />
          )}
          <h3 className={styles.title}>{blog.title || "Untitled Blog"}</h3>
          {blog.summary && <p className={styles.summary}>{blog.summary}</p>}
          <p className={styles.date}>
            {blog.date
              ? new Date(blog.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : ""}
          </p>
        </a>
      ))}
    </section>
  );
}
