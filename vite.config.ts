import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      hmr: env.DISABLE_HMR !== 'true',
      watch: env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/portal-api': {
          target: env.VITE_PORTAL_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: env.VITE_JUMPSERVER_URL || 'http://192.168.56.100',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
