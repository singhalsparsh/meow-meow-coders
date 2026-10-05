// The Mux SDK throws on import ("Cannot read properties of undefined (reading
// 'prototype')") when MUX_TOKEN_ID / MUX_TOKEN_SECRET are absent, and it is
// imported at module scope by several API routes — which made `next build`
// fail while collecting route configuration. Deferring the import to first use
// keeps the build green; the error only surfaces when a video is processed.
let videoClient: any | null = null;

async function createVideoClient() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    throw new Error("MUX_TOKEN_ID and MUX_TOKEN_SECRET are not set");
  }
  const { default: Mux } = await import("@mux/mux-node");
  return new Mux(tokenId, tokenSecret).Video;
}

export const video = async () => (videoClient ??= await createVideoClient());
