import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
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
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true, role });

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
