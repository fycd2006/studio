import { NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { memberAdmin } from "@/lib/member-admin";
import { DEFAULT_GROUPS } from "@/types/plan";

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

function directoryEntry(nickname: string, email?: string) {
  const [local, domain] = (email ?? "").split("@");
  const emailHint = local && domain ? `${local.slice(0, 1)}•••@${domain}` : "";
  return { nickname, emailHint };
}

function adminCredentialFailure() {
  console.error("[account] Firebase Admin credentials unavailable");
  return fail("伺服器的 Firebase 憑證未就緒，暫時無法更新營隊帳號。請聯絡管理員。", 503);
}

export async function POST(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return fail("請重新登入", 401);

  let admin: ReturnType<typeof memberAdmin>;
  try {
    admin = memberAdmin();
  } catch {
    return adminCredentialFailure();
  }
  const identity = await admin.auth.verifyIdToken(token).catch(() => null);
  if (!identity?.uid) return fail("請重新登入", 401);

  const body = await request.json().catch(() => null);
  if (!body) return fail("資料不完整", 400);

  try {
    await admin.checkCredentials();
  } catch {
    return adminCredentialFailure();
  }

  const { db } = admin;
  const self = db.collection("users").doc(identity.uid);
  const memberName = db.collection("memberNames").doc(identity.uid);
  const nickname =
    typeof body.nickname === "string" ? body.nickname.trim() : "";
  const adminCode = process.env.CAMP_ADMIN_CODE || (process.env.NODE_ENV === "production" ? "" : "ntutfycdcamp");
  const crewCode = process.env.CAMP_CREW_CODE || (process.env.NODE_ENV === "production" ? "" : "cdcamp");
  try {
    return await db.runTransaction(async (tx) => {
      const profile = (await tx.get(self)).data();
      if (profile?.status === "disabled") return fail("帳號已停用", 403);
      if (body.action === "join") {
        if (!identity.email) return fail("請使用 Email 或 Google 登入", 403);
        if (profile) {
          if (typeof profile.nickname === "string" && profile.nickname.trim()) {
            tx.set(memberName, directoryEntry(profile.nickname, profile.email ?? identity.email));
          }
          return NextResponse.json({ ok: true });
        }
        if (!nickname || nickname.length > 40)
          return fail("請輸入 1 至 40 字的綽號", 400);
        if (!adminCode || !crewCode) return fail("營隊通行碼尚未設定，請聯絡管理員。", 503);
        const role =
          body.code === adminCode
            ? "admin"
            : body.code === crewCode
              ? "crew"
              : null;
        if (!role) return fail("營隊通行碼錯誤", 403);
        tx.create(self, {
          uid: identity.uid,
          email: identity.email,
          nickname,
          role,
          status: "active",
          createdAt: Date.now(),
        });
        tx.set(memberName, directoryEntry(nickname, identity.email));
      } else if (!profile) return fail("請先完成首次綁定", 403);
      else if (body.action === "nickname" && nickname && nickname.length <= 40) {
        tx.update(self, { nickname });
        tx.set(memberName, directoryEntry(nickname, profile.email ?? identity.email));
      } else if (body.action === "sync-nickname" && profile.nickname) {
        const current = (await tx.get(memberName)).data();
        if (typeof current?.emailHint !== "string") {
          tx.set(memberName, directoryEntry(profile.nickname, profile.email ?? identity.email));
        }
      } else if (body.action === "camp-groups") {
        const { campId, groupIds } = body;
        if (typeof campId !== "string" || !campId || campId.includes("/") || !Array.isArray(groupIds)) {
          return fail("請選擇營期與組別", 400);
        }
        const [camp, settings] = await Promise.all([
          tx.get(db.collection("camps").doc(campId)),
          tx.get(db.collection("userSettings").doc("global")),
        ]);
        if (!camp.exists || (camp.get("isLocked") && profile.role !== "admin")) {
          return fail("找不到可使用的營期", 404);
        }
        const savedGroups = settings.get("groups");
        const groups = [...DEFAULT_GROUPS, ...(Array.isArray(savedGroups) ? savedGroups : [])];
        const validGroups = new Map(groups.filter(group => group?.id && group?.slug).map(group => [group.slug, group.id]));
        const allowedIds = new Set(validGroups.values());
        if (groupIds.some(id => typeof id !== "string" || !allowedIds.has(id))) {
          return fail("有組別已不存在，請重新選擇", 400);
        }
        tx.update(self, new FieldPath("campGroups", campId), [...new Set(groupIds)]);
      } else if (body.action === "upgrade") {
        if (!adminCode) return fail("營隊通行碼尚未設定，請聯絡管理員。", 503);
        if (body.code !== adminCode) return fail("請確認通行碼或操作權限", 403);
        tx.update(self, { role: "admin" });
      } else if (body.action === "manage" && profile.role === "admin") {
        if (
          typeof body.uid !== "string" ||
          !body.uid ||
          body.uid.includes("/") ||
          body.uid === identity.uid
        )
          return fail("不可變更自己的管理員權限", 400);
        const target = db.collection("users").doc(body.uid);
        if (!(await tx.get(target)).exists) return fail("找不到成員", 404);
        if (["crew", "admin"].includes(body.role))
          tx.update(target, { role: body.role });
        else if (["active", "disabled"].includes(body.status))
          tx.update(target, { status: body.status });
        else return fail("無效的成員設定", 400);
      } else return fail("請確認通行碼或操作權限", 403);
      return NextResponse.json({ ok: true });
    });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : null;
    if (code === 7 || code === 16) {
      console.error("[account] Firestore rejected the server credentials", code);
      return fail("伺服器缺少寫入營隊成員資料的權限，請聯絡管理員。", 503);
    }
    console.error("[account] Firestore account update failed", code);
    return fail("無法更新帳號，請稍後再試", 503);
  }
}
