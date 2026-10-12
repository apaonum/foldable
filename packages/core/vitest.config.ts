import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: ['test/**/*.node.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'webkit',
          include: ['test/**/*.browser.test.ts'],
          globalSetup: ['test/support/build-bootstrap.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'webkit' }],
          },
        },
      },
    ],
  },
});
