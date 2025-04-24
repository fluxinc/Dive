import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig(({ command: _ }) => {
  // Get backend URL from environment or use default for Docker
  const backendUrl = process.env.BACKEND_URL || "http://backend:61990"
  
  return {
    build: {
      target: "esnext",
    },
    resolve: {
      alias: {
        "@": path.join(__dirname, "src"),
        "@services": path.join(__dirname, "services")
      },
    },
    plugins: [
      react(),
    ],
    server: {
      host: "0.0.0.0", // Listen on all network interfaces for Docker
      port: 7777,
      allowedHosts: ["densebreast.fluxinc.co", "localhost"],
      proxy: {
        // Proxy all API requests to the MCP server
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/v1/openai": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/model_verify": {
          target: backendUrl,
          changeOrigin: true,
        },
      },
      watch: {
        ignored: ["**/mcp-host/**"],
        exclude: ["**/mcp-host/**"],
      },
    },
    preview: {
      allowedHosts: ["densebreast.fluxinc.co", "localhost"]
    }
  }
})
