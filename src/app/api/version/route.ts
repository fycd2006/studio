import { NextResponse } from "next/server";
import { VERSION_HISTORY } from "@/data/version-history";

export const dynamic = "force-dynamic";

export async function GET() {
  const latest = VERSION_HISTORY[0];

  return NextResponse.json(
    {
      version: latest?.version || process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0",
      label: latest?.label || "",
      buildId: process.env.NEXT_PUBLIC_BUILD_ID || "dev",
      buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || "unknown",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
