import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    proxy: { '/api': process.env.BO_API_URL ?? 'http://127.0.0.1:3001' },
  },
  plugins: [
    tailwindcss(),
    react(),
    babel({ plugins: ['@lingui/babel-plugin-lingui-macro'], presets: [reactCompilerPreset()] })
  ],
})
