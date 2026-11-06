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
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
