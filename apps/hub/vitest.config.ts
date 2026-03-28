import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/game-core/__tests__/**/*.test.ts'],
  },
});
