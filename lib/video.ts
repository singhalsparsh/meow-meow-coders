// Helpers to classify a chapter's video source from its URL.
//
// The chapter video form accepts either:
//   - a direct media file URL (https://host/video.mp4, .webm, ...) → native <video>
//   - a YouTube link (watch / short / youtu.be)                    → privacy-enhanced embed
// The URL is stored as-is in chapter.videoUrl and the player renders the
// right element for it. VikingFiles page embeds are gone: they showed ads and
// leaked the hosting URL, and Mux cannot ingest a page URL.

export interface VideoUrlInfo {
  /** False when the url is empty or not an http(s) URL. */
  isVideo: boolean;
  /** "youtube" for YouTube links, "direct" for any other http(s) URL. */
  kind: "youtube" | "direct" | "unknown";
  /** The YouTube video id, when kind === "youtube". */
  youtubeId?: string;
  /** The raw url the user pasted. */
  original: string;
}

const DIRECT_MEDIA_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v|mkv|m3u8)(\?.*)?$/i;

const YOUTUBE_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
];

const isYoutubeHost = (host: string) =>
  YOUTUBE_HOSTS.some((h) => h.toLowerCase() === host.toLowerCase());

/** Extract the video id from any common YouTube URL format. */
export const extractYoutubeId = (rawUrl: string): string | undefined => {
  if (!rawUrl) return undefined;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }

  if (!isYoutubeHost(url.host)) return undefined;

  // https://youtu.be/ID
  if (url.host.toLowerCase() === "youtu.be") {
    const match = url.pathname.match(/^\/([A-Za-z0-9_-]{6,})$/);
    if (match) return match[1];
  }

  // https://www.youtube.com/watch?v=ID&t=30s
  const watchId = url.searchParams.get("v");
  if (watchId) return watchId;

  // https://www.youtube.com/embed/ID | /shorts/ID | /live/ID
  const embedMatch = url.pathname.match(
    /^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{6,})/
  );
  if (embedMatch) return embedMatch[1];

  return undefined;
};

/** True when the url looks like a direct media file (.mp4, .webm, ...). */
export const isDirectMediaUrl = (rawUrl?: string | null): boolean =>
  !!rawUrl && DIRECT_MEDIA_EXT.test(rawUrl);

export const getVideoUrlInfo = (rawUrl?: string | null): VideoUrlInfo => {
  if (!rawUrl) {
    return { isVideo: false, kind: "unknown", original: rawUrl || "" };
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { isVideo: false, kind: "unknown", original: rawUrl };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { isVideo: false, kind: "unknown", original: rawUrl };
  }

  const youtubeId = extractYoutubeId(rawUrl);
  if (youtubeId) {
    return { isVideo: true, kind: "youtube", youtubeId, original: rawUrl };
  }

  // Any other http(s) URL is treated as a direct source; <video> surfaces a
  // real playback error if the link isn't a media file.
  return { isVideo: true, kind: "direct", original: rawUrl };
};

/**
 * True when a URL is worth handing to the player. Any http(s) URL qualifies —
 * the player shows a clear error if the link turns out not to be a video. This
 * matters because many real "direct video file" links are signed CDN URLs
 * (S3/CloudFront presigned, expiring tokens, ...) that do not end in a media
 * extension yet still serve .mp4/.webm.
 */
export const isPlayableVideoUrl = (rawUrl?: string | null): boolean =>
  getVideoUrlInfo(rawUrl).isVideo;

/** True when the url points at an HLS stream (.m3u8). */
export const isHlsUrl = (rawUrl?: string | null): boolean =>
  !!rawUrl && /\.m3u8($|\?)/i.test(rawUrl);

/** True when the url points at our own UploadThing upload (Mux-ingestible). */
export const isOwnUploadUrl = (rawUrl?: string | null): boolean =>
  !!rawUrl &&
  (rawUrl.includes("utfs.io") || rawUrl.toLowerCase().includes("uploadthing"));

/**
 * Build the Limeplay playback URL for a Mux asset.
 *
 * Mux streams are HLS; Limeplay (Shaka) plays `.m3u8` directly, so a
 * playbackId maps to `https://stream.mux.com/{id}.m3u8`.
 */
export const getMuxPlaybackUrl = (
  playbackId?: string | null
): string | undefined =>
  playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : undefined;

/** A single playable streaming source for Limeplay. */
export interface LimeplaySource {
  id: string;
  src: string;
  title?: string | null;
}

/**
 * Convert a chapter's streaming sources into Limeplay assets.
 *
 * YouTube links are excluded: Limeplay (Shaka) cannot play YouTube embeds, so
 * those chapters fall back to the custom YouTube player instead.
 */
export const toLimeplayAssets = (
  sources: LimeplaySource[],
  fallbackTitle?: string | null
): { id: string; src: string; title: string }[] =>
  sources
    .filter((source) => getVideoUrlInfo(source.src).kind !== "youtube")
    .map((source, index) => ({
      id: source.id,
      src: source.src,
      title: source.title || fallbackTitle || `Stream ${index + 1}`,
    }));
