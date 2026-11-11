import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { proyectosPlugin } from './scripts/lib/vite-plugin-proyectos.ts';

export default defineConfig({
  plugins: [react(), proyectosPlugin()],
  build: {
    target: ['es2022', 'safari15', 'chrome100'],
    // El motor de RA (TensorFlow.js + MindAR) es grande, pero sólo se descarga
    // al activar la cámara, nunca en el catálogo.
    chunkSizeWarningLimit: 2600,
  },
  worker: { format: 'es' },
  // Permite probar el build desde un celular a través de un túnel HTTPS temporal (cloudflared).
  preview: { allowedHosts: ['.trycloudflare.com'] },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/pruebas/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
