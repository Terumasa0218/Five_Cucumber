import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true }, // ビルド時にlintで失敗させない
  transpilePackages: ['@five-cucumber/sdk', '@five-cucumber/ui', '@five-cucumber/metrics', '@five-cucumber/game-cucumber5'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@five-cucumber/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
      'games': path.resolve(__dirname, '../../games')
    };
    return config;
  },
  // NOTE: public 配下はそのまま配信されるため、この rewrites は不要です
  // async rewrites() {
  //   return [
  //     { source: '/assets/:path*', destination: '/public/assets/:path*' },
  //   ];
  // },
};

export default nextConfig;
