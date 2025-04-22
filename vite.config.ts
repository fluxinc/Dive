import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command: _ }) => {
  return {
    build: {
      target: 'esnext',
    },
    resolve: {
      alias: {
        '@': path.join(__dirname, 'src'),
        '@services': path.join(__dirname, 'services')
      },
    },
    plugins: [
      react(),
    ],
    server: {
      proxy: {
        // Proxy all API requests to the MCP server
        '/api': {
          target: 'http://localhost:61990',
          changeOrigin: true,
        },
        '/v1/openai': {
          target: 'http://localhost:61990',
          changeOrigin: true,
        },
        '/model_verify': {
          target: 'http://localhost:61990',
          changeOrigin: true,
        },
      },
      watch: {
        ignored: ["**/mcp-host/**"],
        exclude: ["**/mcp-host/**"],
      },
    }
  }
})
