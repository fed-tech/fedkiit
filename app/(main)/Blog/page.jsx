// /Blog — content moved to /Insights, which shows blogs and socials together.
// Kept as a redirect so existing links and search results keep working.
import { redirect } from "next/navigation";

export default function BlogPage() {
  redirect("/Insights");
}
