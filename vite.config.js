const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

module.exports = defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3001,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})