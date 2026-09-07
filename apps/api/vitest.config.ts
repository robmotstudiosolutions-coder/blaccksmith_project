import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@slotsure/domain': path.resolve(__dirname, '../../packages/domain/src/index.ts'),
      '@slotsure/database/schema': path.resolve(__dirname, '../../packages/database/src/schema.ts'),
      '@slotsure/database': path.resolve(__dirname, '../../packages/database/src/index.ts')
    }
  }
});
