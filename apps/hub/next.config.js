/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@five-cucumber/sdk', '@five-cucumber/ui', '@five-cucumber/metrics', '@five-cucumber/game-cucumber5'],
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/assets/:path*',
        destination: '/public/assets/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
