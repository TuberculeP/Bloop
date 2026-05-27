import { Router } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { bearerAuth } from "../../middleware/auth.middleware";
import { User } from "../../config/entities/User";

import { listSoundfontsTool } from "./tools/soundfonts";
import { listSamplePacksTool, listSamplesTool } from "./tools/samples";
import { getMusicTheoryTool } from "./tools/musicTheory";
import {
  listProjectsTool,
  getProjectTool,
  createProjectTool,
  updateProjectTool,
  addTrackTool,
  removeTrackTool,
  setTrackNotesTool,
  addAudioClipTool,
} from "./tools/projects";

const sseRouter = Router();

const tools = [
  getMusicTheoryTool,
  listSoundfontsTool,
  listSamplePacksTool,
  listSamplesTool,
  listProjectsTool,
  getProjectTool,
  createProjectTool,
  updateProjectTool,
  addTrackTool,
  removeTrackTool,
  setTrackNotesTool,
  addAudioClipTool,
];

const transports = new Map<string, SSEServerTransport>();

function createMcpServer(user: User): Server {
  const server = new Server(
    { name: "bloop", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) {
      return {
        content: [
          { type: "text", text: `Unknown tool: ${request.params.name}` },
        ],
        isError: true,
      };
    }
    try {
      const result = await tool.execute(request.params.arguments || {}, user);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

sseRouter.get("/", bearerAuth, async (req, res) => {
  const user = req.user as User;
  const transport = new SSEServerTransport("/api/mcp/sse/message", res);
  transports.set(transport.sessionId, transport);

  req.on("close", () => {
    transports.delete(transport.sessionId);
  });

  const server = createMcpServer(user);
  await server.connect(transport);
});

sseRouter.post("/message", bearerAuth, async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await transport.handlePostMessage(req, res, req.body);
});

export default sseRouter;
