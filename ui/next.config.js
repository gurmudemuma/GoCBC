/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Keep builds reliable in containers and CI environments with process limits.
  experimental: {
    cpus: 1,
  },
  reactStrictMode: false,
  swcMinify: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    CECBS_API_URL: process.env.CECBS_API_URL || 'http://localhost:3001/api/v1',
  },
};

module.exports = nextConfig;
