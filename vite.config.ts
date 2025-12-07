import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dizer ao Vite que os arquivos estão na raiz, não em src/
  root: './',
  build: {
    outDir: 'dist',
  },
  define: {
    // Evita erro "process is not defined" no navegador
    'process.env': {} 
  }
})