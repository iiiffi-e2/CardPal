import { NextResponse } from "next/server";

export function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function upstreamError(message = "Upstream API request failed.") {
  return NextResponse.json({ error: message }, { status: 502 });
}
