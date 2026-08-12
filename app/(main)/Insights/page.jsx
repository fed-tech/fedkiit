// /Insights — all social media posts and blogs on one page.
// Server page: SocialFeed and BlogFeed query Prisma directly.
import SocialFeed from "@/components/SocialFeed";
import BlogFeed from "@/components/BlogFeed";
import styles from "./page.module.scss";

export const metadata = {
  title: "Insights | FED KIIT",
  description:
    "Latest social media posts and blogs from the Federation of Entrepreneurship Development, KIIT.",
};

export default function InsightsPage() {
  return (
    <main className={styles.page}>
      <section id="socials" className={styles.section}>
        <h2 className={styles.heading}>
          Our <span>Socials</span>
        </h2>
        <SocialFeed />
      </section>
      <section id="blogs" className={styles.section}>
        <h2 className={styles.heading}>
          Our <span>Blogs</span>
        </h2>
        <BlogFeed />
      </section>
    </main>
  );
}
