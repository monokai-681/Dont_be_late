import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Dont_be_late/',
  build: { outDir: 'dist/web', emptyOutDir: true },
});
