import { app } from "electron"
import envPaths from "env-paths"
import os from "os"
import path from "path"

export const envPath = envPaths(app.getName(), {suffix: ""})
export const configDir = envPath.config
export const cacheDir = envPath.cache
export const homeDir = os.homedir()
export const appDir = path.join(homeDir, ".dive")
export const scriptsDir = path.join(appDir, "scripts")

export const binDirList = [
  path.join(process.resourcesPath, "node"),
  path.join(process.resourcesPath, "uv"),
  path.join(process.resourcesPath, "python"),
]

export const darwinPathList = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/usr/bin",
]

export const DEF_MCP_SERVER_CONFIG = {
  "mcpServers": {
    "flux-rag-server-stdio": {
      "enabled": true,
      "command": "node",
      "args": [
        "/Users/lukezeches/Work/RAG/mcp/dist/index.js", // TODO: decide where to store the MCP server 
        "--log"
      ],
      "env": {
        "DATABRIDGE_SERVER_URL": "http://localhost:8000",
        "LOG_FILE_PATH": path.join(envPath.log, "rag-server.log")
      },
    },
  }
}
