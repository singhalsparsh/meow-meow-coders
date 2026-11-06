import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only auth + webhook endpoints are public. Everything else (including the
// dashboard and course pages) is gated behind sign-in. Sign-in/sign-up MUST
// be public, otherwise Clerk's redirect-to-sign-in fires again on the sign-in
// page itself and the browser hits an infinite redirect loop.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/uploadthing(.*)",
  "/api/webhook(.*)",
  // Same-origin media proxy: the <video> element / Shaka fetch streams through
  // this route. It must be public so an authenticated video request isn't
  // redirected to sign-in (a redirect loop, or a 307 that breaks playback).
  // Access is still constrained to public http(s) hosts by isAllowedProxyTarget.
  "/api/video-proxy(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
