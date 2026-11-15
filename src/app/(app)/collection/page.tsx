import { redirect } from "next/navigation";

// There is no page at /collection itself; send visitors to the list view.
export default function CollectionPage() {
  redirect("/collection/list");
}
