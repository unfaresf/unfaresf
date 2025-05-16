import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    setupFiles: ['./test/unittest.setup.ts', './test/integrationtest.setup.ts'],
    include: ['**/*.integration.ts']
  }
});