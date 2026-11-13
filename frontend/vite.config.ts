import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
const proxy = {
  '/api': {
    target: `http://127.0.0.1:${process.env.GATHER_API_PORT || '8080'}`,
    changeOrigin: false,
  },
};
export default defineConfig({
  plugins: [react()],
  server: { port: Number(process.env.GATHER_WEB_PORT || 5173), strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
