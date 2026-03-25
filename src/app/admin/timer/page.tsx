import { redirect } from "next/navigation";

export default function AdminTimerRedirectPage() {
  redirect("/admin#timer");
}
