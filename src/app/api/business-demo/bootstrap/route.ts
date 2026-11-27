import { NextResponse } from "next/server";
import { allowDemoRequest, findValidDemo } from "@/lib/onboarding/demo-access";
import {
  createDemoSession,
  DEMO_COOKIE,
  demoTokenPattern,
} from "@/lib/onboarding/demo-security";

export const runtime = "nodejs";
const responseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
export async function POST(request: Request) {
  try {
    const canonical = new URL(process.env.SITE_URL || "https://myckeo.com")
      .origin;
    if (request.headers.get("origin") !== canonical)
      return NextResponse.json(
        { ok: false },
        { status: 403, headers: responseHeaders },
      );
    if (!(await allowDemoRequest(request.headers)))
      return NextResponse.json(
        { ok: false },
        { status: 429, headers: { ...responseHeaders, "Retry-After": "60" } },
      );
    const body: unknown = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length !== 1 ||
      !("token" in body) ||
      typeof body.token !== "string" ||
      !demoTokenPattern.test(body.token)
    )
      return NextResponse.json(
        { ok: false },
        { status: 400, headers: responseHeaders },
      );
    const demo = await findValidDemo(body.token);
    if (!demo)
      return NextResponse.json(
        { ok: false },
        { status: 410, headers: responseHeaders },
      );
    const response = NextResponse.json(
      { ok: true },
      { headers: responseHeaders },
    );
    response.cookies.set(
      DEMO_COOKIE,
      createDemoSession(body.token, demo.expiresAt),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/demo",
        expires: demo.expiresAt,
      },
    );
    return response;
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 503, headers: responseHeaders },
    );
  }
}
