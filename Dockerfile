FROM node:23-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN touch .env

RUN npm run build

# Étape finale, beaucoup plus légère
FROM node:23-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env .env

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

EXPOSE 3000

# Migrations appliquées par le nouveau conteneur avant le démarrage de l'app.
# Si elles échouent, le conteneur s'arrête et Coolify garde l'ancienne version.
CMD ["sh", "-c", "npm run migration:run:prod && npm start"]