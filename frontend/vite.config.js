import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    basicSsl(),
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    warmup: {
      clientFiles: ['./src/main.jsx', './src/App.jsx'],
    },
  },
  preview: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'react-hot-toast', 'recharts'],
          'markdown-vendor': ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-raw', 'rehype-katex'],
          'export-vendor': ['jspdf', 'jspdf-autotable', 'docx', 'html2canvas', 'html-to-image', 'file-saver'],
        },
      },
    },
  },
});
