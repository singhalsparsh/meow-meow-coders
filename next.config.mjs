/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        // Course images are pasted as URLs from any host, so allow any https
        // host for next/image. `**` also keeps utfs.io (UploadThing) working.
        {
          protocol: "https",
          hostname: "**",
        },
      ],
      // Request WebP when the client supports it — dramatically smaller than
      // the same photo served as JPEG/PNG.
      formats: ["image/webp", "image/avif"],
      // Allowed optimizer qualities. 75 is a good bandwidth/quality trade-off
      // for course thumbnails.
      qualities: [75],
      // Cache optimized images this long (seconds) so repeat visitors don't
      // re-fetch them from the origin.
      minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
  }

  export default nextConfig;
