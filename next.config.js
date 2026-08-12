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
    },
  }

  module.exports = nextConfig;
