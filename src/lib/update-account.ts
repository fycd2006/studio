import type { User } from "firebase/auth";
export async function updateAccount(
  user: User | null,
  body: Record<string, string | string[]>,
) {
  if (!user) throw new Error("請先登入");
  const response = await fetch("/api/account", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + (await user.getIdToken()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error((await response.json()).error || "操作失敗");
}
