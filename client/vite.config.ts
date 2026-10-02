import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const env = loadEnv(mode, process.cwd(), '');

  /**
   * Optional dev proxy target (e.g. http://localhost:5000). Never hardcoded —
   * set VITE_API_PROXY_TARGET in .env.local. When present, `/api` requests are
   * proxied so the browser sees a same-origin API and httpOnly cookies work
   * without CORS/SameSite friction.
   */
  const proxyTarget = env.VITE_API_PROXY_TARGET?.trim();

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    esbuild: {
      // Strip console logs and debugger statements in production bundle
      drop: isProd ? ['console', 'debugger'] : [],
    },
    build: {
      // Do not ship source maps to production to prevent reverse-engineering of source files
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      ...(proxyTarget
        ? {
            proxy: {
              '/api': {
                target: proxyTarget,
                changeOrigin: true,
                secure: false,
              },
            },
          }
        : {}),
    },
  };
});
