// The configuration for the cache system, including Redis (prod) and SQLite (dev) session stores

import "dotenv/config";
import session from "express-session";
import * as sqlite3 from "sqlite3";
import sqliteStoreFactory from "express-session-sqlite";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";

const DEFAULT_TLL = 60 * 60 * 24; // 1 day in seconds
const DEFAULT_PREFIX = "sess:";

function createStore() {
  if (process.env.NODE_ENV === "production") {
    const redisClient = createClient({
      url: "redis://cache", // Use the Docker service name for Redis
    });
    redisClient.connect().catch(console.error);
    return new RedisStore({
      client: redisClient,
      prefix: DEFAULT_PREFIX,
      ttl: DEFAULT_TLL,
    });
  } else {
    const SqliteStore = sqliteStoreFactory(session);

    return new SqliteStore({
      driver: sqlite3.Database,
      path: "./express_session_local.db",
      ttl: DEFAULT_TLL * 1000, // SQLite store uses milliseconds
      prefix: DEFAULT_PREFIX,
      cleanupInterval: 300000,
    });
  }
}

// Will be used in app.use
export default function customSession() {
  const store = createStore();

  return session({
    secret: "you'll never guess this (poulet froid)",
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset cookie expiry on each request
    cookie: {
      secure: false,
      maxAge: DEFAULT_TLL * 1000, // 1 jour en ms (aligné avec le TTL du store)
    },
    store,
  });
}
