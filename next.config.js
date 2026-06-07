/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  async redirects() {
    // Make the personal Studio app the landing page. EliteBids and the other
    // apps remain reachable at their own paths (/listing, /marketplace, etc.).
    return [{ source: "/", destination: "/studio", permanent: false }];
  },
};

module.exports = nextConfig;
