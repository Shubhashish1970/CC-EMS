import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      root: './frontend',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_API_URL': JSON.stringify(
          mode === 'production' 
            ? env.VITE_API_URL || 'https://api-dev.cc-ems.com/api'
            : env.VITE_API_URL || 'http://localhost:5001/api'
        ),
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: mode === 'development',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './frontend/src'),
        }
      }
    };
});
