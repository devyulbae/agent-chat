import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    allowedHosts: ['sybae.duckdns.org', 'localhost', '127.0.0.1'],
  },
})
