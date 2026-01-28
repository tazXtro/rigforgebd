import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/**',
      },
      // Bangladeshi retailers
      {
        protocol: 'https',
        hostname: 'www.skyland.com.bd',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'skyland.com.bd',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.startech.com.bd',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'startech.com.bd',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.ryanscomputers.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ryanscomputers.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.techlandbd.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'techlandbd.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.globalbrand.com.bd',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'globalbrand.com.bd',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.ultratech.com.bd',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ultratech.com.bd',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.ucc.com.bd',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ucc.com.bd',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.computersourcebd.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'computersourcebd.com',
        pathname: '/**',
      },
    ],
    // Allow data URLs for testing phase (build images)
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
