import { redirect } from "next/navigation";

export default function AdminRotationRedirectPage() {
  redirect("/admin#tables");
}
