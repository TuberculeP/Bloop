import "reflect-metadata";
import "dotenv/config";
import pg from "./config/db.config";
import path from "path";
import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import { Server as WSServer } from "socket.io";
import { registerWebsocketListeners } from "./events/event_handler";
import router from "./routes";
import cookieParser from "cookie-parser";
import passport from "passport";
import initializePassport from "./config/passport.config";

import customSession from "./config/cache.config";
import { seedDefaultAdmin } from "./scripts/seedAdmin";

const main = async () => {
  const dev = process.env.NODE_ENV !== "production";

  initializePassport();

  const app = express();
  app.set("trust proxy", 1);
  const server = createHttpServer(app);
  app
    .use(cors({ origin: true, credentials: true }))
    .use(express.json())
    .use(express.urlencoded({ extended: false }))
    .use(cookieParser())
    .use(customSession())
    .use(passport.initialize())
    .use(passport.session());

  // Well-known OAuth endpoints (must be at root, not under /api)
  app.get("/.well-known/oauth-protected-resource", (req, res) => {
    const base = `${req.protocol}://${req.get("host")}`;
    res.json({
      resource: `${base}/api/mcp/sse`,
      authorization_servers: [base],
    });
  });

  app.get("/.well-known/oauth-authorization-server", (req, res) => {
    const base = `${req.protocol}://${req.get("host")}`;
    res.json({
      issuer: base,
      authorization_endpoint: `${base}/api/mcp/oauth/authorize`,
      token_endpoint: `${base}/api/mcp/oauth/token`,
      registration_endpoint: `${base}/api/mcp/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
    });
  });

  app.use("/api", router);

  const vite = await createViteServer();

  if (dev) {
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "./client")));
  }

  app.use(async (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
    } else {
      if (dev) {
        vite.middlewares(req, res, next);
      } else {
        res.sendFile(path.resolve(__dirname, "./client/index.html"));
      }
    }
  });

  app.use("/public", express.static(path.join(__dirname, "public")));

  // WebSocket server
  const wss = new WSServer(server);
  registerWebsocketListeners(wss);

  server.listen(3000, () => {
    console.log("> Ready on http://localhost:3000");
  });

  const shutdown = () => {
    wss.close();
    server.closeAllConnections?.();
    server.close(() => process.exit(0));
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
};

// start typeorm migration and server
(async () => {
  await pg.initialize();
  await pg.runMigrations();
  await seedDefaultAdmin();
  await main();
})();
