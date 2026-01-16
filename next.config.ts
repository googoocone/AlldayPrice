import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.oliveyoung.co.kr',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
