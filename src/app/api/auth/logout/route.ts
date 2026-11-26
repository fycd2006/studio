import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("studio_role", "", {
    maxAge: 0,
    path: "/",
  });
  response.cookies.delete("studio_test_session");
  return response;
}
