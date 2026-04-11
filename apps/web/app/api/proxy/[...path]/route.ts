import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const apiPath = `/api/${path.join("/")}`;
  const queryString = request.nextUrl.search;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("badminton-session");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (sessionCookie) {
    headers["Cookie"] = `badminton-session=${sessionCookie.value}`;
  }

  const body =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.text()
      : undefined;

  const res = await fetch(`${env.API_BASE_URL}${apiPath}${queryString}`, {
    method: request.method,
    headers,
    body,
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
