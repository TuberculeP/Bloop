// The configuration for the cache system, including Redis (prod) and SQLite (dev) session stores

import "dotenv/config";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";

// 1 jour en prod, 7 jours en dev (SQLite moins stable)
const DEFAULT_TTL =
  process.env.NODE_ENV === "production"
    ? 60 * 60 * 24 // 1 jour
    : 60 * 60 * 24 * 7; // 7 jours
const DEFAULT_PREFIX = "sess:";

async function createStore() {
  if (process.env.NODE_ENV === "production") {
    const redisClient = createClient({
      url: "redis://cache", // Use the Docker service name for Redis
    });
    redisClient.connect().catch(console.error);
    return new RedisStore({
      client: redisClient,
      prefix: DEFAULT_PREFIX,
      ttl: DEFAULT_TTL,
    });
  } else {
    // Chargés dynamiquement : sqlite3 est dev-only, absent de l'image Docker
    const [{ default: sqlite3 }, { default: sqliteStoreFactory }] =
      await Promise.all([import("sqlite3"), import("express-session-sqlite")]);
    const SqliteStore = sqliteStoreFactory(session);

    return new SqliteStore({
      driver: sqlite3.Database,
      path: "./express_session_local.db",
      ttl: DEFAULT_TTL,
      prefix: DEFAULT_PREFIX,
      cleanupInterval: 300000,
    });
  }
}

// Will be used in app.use
export default async function customSession() {
  const store = await createStore();

  return session({
    secret: "you'll never guess this (poulet froid)",
    resave: false,
    saveUninitialized: false,
    rolling: true, // Renouvelle le cookie à chaque requête (session active = pas d'expiration)
    cookie: {
      secure: "auto",
      maxAge: DEFAULT_TTL * 1000,
    },
    store,
  });
}
