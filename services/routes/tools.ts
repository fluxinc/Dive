import express from "express";
import { MCPServerManager } from "../mcpServer/index.js";

export function toolsRouter() {
  const router = express.Router();

  router.get("/", (req, res) => {
    try {
      const tools = MCPServerManager.getInstance().getToolInfos();
      res.json({
        success: true,
        tools: tools,
      });
    } catch (error: any) {
      res.json({
        success: false,
        message: error.message,
      });
    }
  });

  // Add route to clear MCP server data for a specific chat
  router.post("/clear/:chatId", (req, res) => {
    try {
      const chatId = req.params.chatId;
      MCPServerManager.getInstance().clearChatData(chatId);
      res.json({
        success: true,
        message: `MCP data cleared for chat: ${chatId}`
      });
    } catch (error: any) {
      res.json({
        success: false,
        message: error.message,
      });
    }
  });

  return router;
}
