import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { postgresOptions } from "./db.options";

// DataSource de déploiement : applique les migrations sur la base de
// l'environnement courant (staging ou prod, via POSTGRES_URL fourni par Coolify).
// Utilisé uniquement par `npm run migration:run:prod`.
const { POSTGRES_URL } = process.env;

if (!POSTGRES_URL) {
  throw new Error("POSTGRES_URL est requis pour exécuter les migrations.");
}

export default new DataSource(postgresOptions(POSTGRES_URL));
