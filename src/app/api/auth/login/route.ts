import { NextRequest, NextResponse } from "next/server";

import { memberAdmin } from "@/lib/member-admin";
import { isEmulatorEnabled } from "@/firebase/emulator";

export function GET(req: NextRequest) {
  const token =
    isEmulatorEnabled() && req.cookies.get("studio_test_session")?.value;
  return NextResponse.json(
    { token: token || null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  if (!isEmulatorEnabled())
    return NextResponse.json({ error: "僅供本機測試" }, { status: 403 });
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
    }

    const adminUser = process.env.STUDIO_ADMIN_USERNAME || "admin";
    const adminPass = process.env.STUDIO_ADMIN_PASSWORD || "ntutfycdcamp";
    const crewUser = process.env.STUDIO_CREW_USERNAME || "crew";
    const crewPass = process.env.STUDIO_CREW_PASSWORD || "cdcamp";

    let role: "admin" | "crew" | null = null;

    if (username === adminUser && password === adminPass) {
      role = "admin";
    } else if (username === crewUser && password === crewPass) {
      role = "crew";
    }

    if (!role) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const { auth, db } = memberAdmin();
    const uid = "e2e-" + role;
    const ref = db.collection("users").doc(uid);
    await db.runTransaction(async (tx) => {
      if (!(await tx.get(ref)).exists)
        tx.create(ref, {
          uid,
          role,
          email: uid + "@example.test",
          nickname: uid,
          status: "active",
          createdAt: Date.now(),
        });
    });
    const token = await auth.createCustomToken(uid);
    const response = NextResponse.json({ success: true, role, token });
    response.cookies.set("studio_test_session", token, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 3600,
    });

    // Set secure cookie for server-side auth checking
    response.cookies.set("studio_role", role, {
      httpOnly: false, // Accessible to client for UI states
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
