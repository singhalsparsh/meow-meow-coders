import Mux from "@mux/mux-node";

let videoClient: ReturnType<typeof createVideoClient> | null = null;

// Lazy singleton: constructed only when a route actually needs to talk to
// Mux (video ingest / delete). Constructing at module scope used to make the
// route modules throw — and `next build` fail — whenever MUX_TOKEN_ID /
// MUX_TOKEN_SECRET were absent from the environment. With this, the error
// surfaces only when a video is actually processed.
function createVideoClient() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    throw new Error("MUX_TOKEN_ID and MUX_TOKEN_SECRET are not set");
  }
  return new Mux(tokenId, tokenSecret).Video;
}

export const video = () => (videoClient ??= createVideoClient());
