import { defineVitestConfig } from '@nuxt/test-utils/config'
import { configDefaults } from 'vitest/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    setupFiles: ['./test/test.setup.ts'],
    // Playwright specs live in test/e2e and use *.spec.ts, which vitest's
    // default glob would otherwise try to run. Keep them out of the unit suite.
    exclude: [...configDefaults.exclude, 'test/e2e/**'],
  }
});
