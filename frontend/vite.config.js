import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    basicSsl(),
    tailwindcss(),
    react(),
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
    minify: 'esbuild',
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'react-hot-toast'],
          'recharts-vendor': ['recharts'],
          'markdown-vendor': ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-raw', 'rehype-katex', 'marked'],
          'syntax-highlight-vendor': ['react-syntax-highlighter'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable', 'html-to-image'],
          'docx-vendor': ['docx'],
          'utils-vendor': ['unidecode', 'jszip', 'file-saver', 'jszip'],
        },
      },
    },
  },
});
