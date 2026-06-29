import { defineConfig } from 'vitest/config'

// Standalone config for pure unit tests (scoring math). Deliberately does NOT
// load the app's vite.config.ts Cloudflare plugin, which isn't vitest-compatible.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
