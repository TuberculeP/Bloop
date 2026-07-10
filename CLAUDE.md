# Bloop - Documentation Projet

> DAW collaboratif web avec réseau social intégré.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Vue 3 + Pinia + TypeScript + SCSS |
| Backend | Express.js + TypeORM + PostgreSQL |
| Storage | Cloudflare R2 (S3-compatible) |
| Cache audio | IndexedDB (500MB, LRU) |
| Auth | Session-based + Google OAuth |

## Structure

```
pie-poc-2/
├── webapp/                    # Frontend Vue 3
│   └── src/
│       ├── components/app/    # DAW (voir CLAUDE.md)
│       ├── views/admin/       # Admin (voir CLAUDE.md)
│       └── stores/            # Pinia stores
├── server/                    # Backend Express
│   └── src/
│       ├── config/entities/   # Entités TypeORM
│       └── routes/            # API REST
└── CLAUDE.md
```

## Documentation par module

| Module | Fichier | Description |
|--------|---------|-------------|
| DAW Timeline | `webapp/src/components/app/CLAUDE.md` | Piano roll, pistes, engines audio |
| Piano Roll | `webapp/src/components/app/timeline/PianoRoll/CLAUDE.md` | Éditeur de notes |
| Admin | `webapp/src/views/admin/CLAUDE.md` | Gestion users + samples |
| Onboarding | `webapp/src/lib/onboarding/CLAUDE.md` | Tour guidé driver.js, gotchas de ciblage dynamique |

## Commandes

```bash
# Dev (depuis racine)
npm run dev          # Lance server + webapp

# Depuis /webapp
npm run dev          # Vite dev server
npm run build        # Build production
npm run lint         # ESLint

# Depuis /server
npm run dev          # Express avec nodemon
npm run build        # TypeScript compile
```

## Variables d'environnement

```bash
# Auth Google
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Database
POSTGRES_DB=mydatabase
POSTGRES_PASSWORD=password
POSTGRES_USER=user

# Cloudflare R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=bloop-samples
CDN_BASE_URL=https://samples.bloop-on.cloud
VITE_CDN_BASE_URL=https://samples.bloop-on.cloud

# Email
RESEND_API_KEY=xxx

# Admin initial
DEFAULT_ADMIN_EMAIL=xxx
DEFAULT_ADMIN_PASSWORD=xxx

# Quota d'upload de samples utilisateur (en Mo, défaut 250)
USER_SAMPLE_QUOTA_MB=250
```

## Conventions

- **Stores** : Pinia Composition API
- **Composants** : Vue 3 `<script setup>` + TypeScript
- **Audio** : Classes TypeScript pures (pas de dépendance Vue)
- **CSS** : SCSS scoped avec variables CSS (`--color-*`)
- **API** : REST avec réponses `{ status, message, body }`
- **Icônes** : pas d'emoji dans le code (UI, commits, logs) — utiliser FontAwesome (`fas fa-*`, déjà chargé dans `webapp/index.html`)

## Domaines

| Env | URL |
|-----|-----|
| Dev | http://localhost:3000 |
| Staging | https://staging.bloop-on.cloud |
| Prod | https://bloop-on.cloud |
| CDN Samples | https://samples.bloop-on.cloud |
