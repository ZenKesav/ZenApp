import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const PORT = parseInt(env.VITE_PORT || '3000', 10);
  const BACKEND_URL = env.VITE_BACKEND_URL || 'http://localhost:5555';

  return {
    plugins: [react()],
    assetsInclude: ['**/*.PNG'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: PORT,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: BACKEND_URL,
          changeOrigin: true,
        },
        '/ws': {
          target: BACKEND_URL,
          ws: true,
        },
        '/socket.io': {
          target: BACKEND_URL,
          ws: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
    },
  };
});
