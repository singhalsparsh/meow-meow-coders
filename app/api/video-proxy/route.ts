import { NextRequest } from "next/server";
import { verifyVideoToken, isAllowedProxyTarget } from "@/lib/video-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Same-origin streaming proxy for cross-origin media (Archive.org, etc.).
 *
 * The browser's <video> / Shaka fetch these bytes from OUR origin, so:
 *   - the upstream host never sees a cross-origin request (no CORS wall),
 *   - we forward byte-range requests so seeking works,
 *   - we propagate the correct Content-Type/Content-Range.
 *
 * Two accepted inputs:
 *   /api/video-proxy?t=<signed token>   (legacy, from signVideoUrl)
 *   /api/video-proxy?url=<encoded url>   (validated by isAllowedProxyTarget)
 */
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams;
  const token = search.get("t");
  const urlParam = search.get("url");

  let target: string | null = null;

  if (urlParam) {
    target = isAllowedProxyTarget(urlParam) ? urlParam : null;
  } else if (token) {
    const v = verifyVideoToken(token);
    target = v?.url ?? null;
  }

  if (!target) {
    return new Response("Invalid or forbidden proxy target", { status: 400 });
  }

  const upstreamHeaders: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; app-video-proxy/1.0)",
    "Accept-Encoding": "*",
  };

  const range = req.headers.get("range");
  if (range) {
    upstreamHeaders.Range = range;
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, { headers: upstreamHeaders });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[video-proxy] upstream fetch failed:", err.message);
    return new Response("Upstream fetch failed", { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    console.error(
      "[video-proxy] upstream status",
      upstream.status,
      "for",
      target
    );
    return new Response("Upstream error", { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type");
  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  const acceptRanges = upstream.headers.get("accept-ranges");

  const headers = new Headers();
  if (contentType) headers.set("Content-Type", contentType);
  if (contentLength) headers.set("Content-Length", contentLength);
  if (contentRange) headers.set("Content-Range", contentRange);
  if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Cache-Control", "public, max-age=86400");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
