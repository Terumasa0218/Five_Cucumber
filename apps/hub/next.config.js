import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { externalDir: true },
  eslint: { ignoreDuringBuilds: true }, // ビルド時にlintで失敗させない
  transpilePackages: ['@five-cucumber/sdk', '@five-cucumber/ui', '@five-cucumber/metrics', '@five-cucumber/game-cucumber5'],
  images: {
    domains: ['localhost'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      games: path.resolve(__dirname, '../../games'), // monorepoのgames直下を別名で参照
    };
    return config;
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

export default nextConfig;
