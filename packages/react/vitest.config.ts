import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const coreSource = fileURLToPath(new URL('../core/src/index.ts', import.meta.url));

export default defineConfig({
  resolve: { alias: { '@foldablejs/core': coreSource } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['test/**/*.node.test.{ts,tsx}'],
          environment: 'node',
          globalSetup: ['test/support/build-react.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'webkit',
          include: ['test/**/*.browser.test.{ts,tsx}'],
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
