/** @type {import('next').NextConfig} */
const configuredApiUrl = process.env.INTERNAL_API_URL
  || process.env.CECBS_API_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://127.0.0.1:3001/api/v1';
const normalizedApiUrl = configuredApiUrl.replace(/\/+$/, '');
const apiProxyTarget = normalizedApiUrl.endsWith('/api/v1')
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api/v1`;

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
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
