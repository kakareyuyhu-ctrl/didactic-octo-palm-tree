import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    hmr: { protocol: 'wss', clientPort: 443 },
  },
  preview: { port: 5173, host: true },
  plugins: [react()],
});