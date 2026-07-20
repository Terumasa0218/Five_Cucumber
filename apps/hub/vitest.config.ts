import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  test: {
    include: [
      'lib/__tests__/**/*.test.ts',
      'lib/game-core/__tests__/**/*.test.ts',
      'lib/modes/**/__tests__/**/*.test.ts',
    ],
  },
});
