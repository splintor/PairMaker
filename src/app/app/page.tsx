import { redirect } from "next/navigation";

export default function AppIndex() {
  // The candidate list is the home screen after login.
  redirect("/app/candidates");
}
