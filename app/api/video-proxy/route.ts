import { auth } from "@clerk/nextjs/server";

import {
  isAllowedProxyTarget,
  signVideoUrl,
  verifyVideoToken,
} from "@/lib/video-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Streams a signed media URL from our own origin so the upstream CDN host is
// never exposed to the client. HLS manifests are rewritten so every segment
// and sub-playlist is also fetched through this proxy.

// Upstream headers we relay to the browser for binary media. `content-length`
// is deliberately NOT forwarded: we re-wrap the body in a fresh Response and
// let the platform send it chunked, so a stale length can never truncate the
// stream mid-video. `content-encoding` IS forwarded so gzip-served files still
// decode client-side.
const HEADERS_TO_FORWARD = [
  "content-type",
  "content-encoding",
  "content-range",
  "accept-ranges",
  "content-disposition",
  "etag",
  "last-modified",
  "cache-control",
];

/** Resolve a (possibly relative) URI against the manifest's own URL. */
const resolveUri = (uri: string, base: URL): string =>
  new URL(uri, base).toString();

/** Rewrite URI="..." attributes inside #EXT-X-* lines (KEY, MAP, MEDIA). */
const rewriteUriAttributes = (line: string, base: URL): string =>
  line.replace(
    /(URI=")([^"]*)(")/g,
    (_match, pre: string, uri: string, post: string) =>
      `${pre}${signVideoUrl(resolveUri(uri, base))}${post}`
  );

/** Rewrite a bare playlist/segment URI line into a signed proxy URL. */
const rewriteUriLine = (line: string, base: URL): string =>
  signVideoUrl(resolveUri(line.trim(), base));

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("t");
    if (!token) return new Response("Bad request", { status: 400 });

    const info = verifyVideoToken(token);
    if (!info) return new Response("Forbidden", { status: 403 });
    if (!isAllowedProxyTarget(info.url)) {
      return new Response("Forbidden", { status: 403 });
    }

    const targetUrl = info.url;
    const range = req.headers.get("range");
    const upstream = await fetch(targetUrl, {
      headers: {
        ...(range ? { range } : {}),
        "user-agent":
          "Mozilla/5.0 (compatible; CourseCrafter/1.0; +video-proxy)",
      },
      redirect: "follow",
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response("Upstream error", { status: upstream.status });
    }

    const isManifest =
      /\.m3u8($|\?)/i.test(targetUrl) ||
      (upstream.headers.get("content-type") ?? "").includes("mpegurl");

    if (isManifest) {
      // Fetch the playlist and rewrite every referenced URI to go through us.
      const text = await upstream.text();
      const base = new URL(targetUrl);
      const rewritten = text
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith("#")) {
            return line.includes("URI=") ? rewriteUriAttributes(line, base) : line;
          }
          return rewriteUriLine(line, base);
        })
        .join("\n");

      return new Response(rewritten, {
        headers: {
          "content-type": "application/vnd.apple.mpegurl",
          "cache-control": "no-store",
        },
      });
    }

    // Binary media: stream the upstream bytes, preserving range semantics.
    const headers = new Headers();
    for (const name of HEADERS_TO_FORWARD) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("access-control-allow-origin", "*");
    headers.set("cache-control", "private, max-age=3600");

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.log("[VIDEO_PROXY]", error);
    return new Response("Internal error", { status: 500 });
  }
}
