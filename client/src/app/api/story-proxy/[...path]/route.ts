/**
 * Proxy for the Story-API REST endpoint (DKG queries).
 *
 * The CDR SDK calls /dkg/* endpoints to get the global public key and partial
 * decryptions. The validator node at http://172.192.41.96:1317 has no CORS
 * headers, so browser-side fetches are blocked. This route proxies those
 * requests server-to-server.
 *
 * Usage (in CDRClient): apiUrl = "<origin>/api/story-proxy"
 * The SDK then fetches e.g. /api/story-proxy/dkg/latest_active which lands here.
 */

import { NextRequest, NextResponse } from "next/server";

const STORY_API_BASE = "http://172.192.41.96:1317";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const upstream = `${STORY_API_BASE}/${path.join("/")}${request.nextUrl.search}`;

  try {
    const res = await fetch(upstream, {
      headers: { accept: "application/json" },
      // No cache — DKG state changes frequently
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[story-proxy] fetch error:", err);
    return NextResponse.json(
      { error: "Failed to reach Story API" },
      { status: 502 }
    );
  }
}
