import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: ['./test/setup.ts'], include: ['test/**/*.test.tsx'], env: { VITE_API_BASE_URL: 'https://api.test' } },
});
