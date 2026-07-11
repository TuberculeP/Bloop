# Interface Admin - Documentation Technique

> Interface d'administration pour la gestion des utilisateurs et de la bibliothèque de samples.

## Vue d'ensemble

L'admin permet de :
- Gérer les utilisateurs (rôles, activation)
- Gérer la bibliothèque de samples (packs → folders → samples)
- Uploader des fichiers audio vers Cloudflare R2

## Architecture

```
views/admin/
├── AdminDashboard.vue    # Stats globales
├── AdminUsers.vue        # Liste + gestion users
├── AdminSamples.vue      # Liste des packs
├── AdminPackDetail.vue   # Détail pack + folders
├── AdminFolderDetail.vue # Détail folder + samples (édition/suppression, pas d'upload individuel)
└── CLAUDE.md

components/admin/
└── ZipPackImporter.vue   # Import bulk d'un pack complet via ZIP (seul chemin d'upload actuel)

layouts/
└── AdminLayout.vue       # Sidebar + header admin

stores/
└── adminStore.ts         # État + actions CRUD
```

> Note : un composant `SampleUploader.vue` (upload individuel drag & drop vers R2, décrit plus bas) était documenté ici mais n'existe pas dans le code — seul l'import bulk via `ZipPackImporter.vue` est implémenté.

## Store `adminStore`

Pinia store centralisant toute la logique admin.

### État

```typescript
// Users
users: AdminUser[]
usersPagination: Pagination
usersLoading: boolean

// Packs
packs: AdminPack[]
packsPagination: Pagination
packsLoading: boolean

// Détails
currentPack: AdminPack | null
currentFolders: AdminFolder[]
currentFolder: AdminFolder | null
currentSamples: AdminSample[]

// Stats
stats: { totalUsers, totalPacks, totalSamples }
```

### Actions principales

| Action | Description |
|--------|-------------|
| `fetchUsers(page, search?)` | Liste paginée avec recherche |
| `updateUser(id, data)` | Modifie rôle/isActive |
| `deleteUser(id)` | Désactive l'utilisateur |
| `fetchPacks(page)` | Liste des packs |
| `fetchPackDetail(id)` | Pack + ses folders |
| `createPack/updatePack/deletePack` | CRUD packs |
| `createFolder/updateFolder/deleteFolder` | CRUD folders |
| `fetchSamples(folderId)` | Samples d'un folder |
| `createSample/updateSample/deleteSample` | CRUD samples |
| `uploadFile(file, packSlug, folderName?)` | Upload vers R2 |

## Routes API Admin

Base: `/api/admin`

### Users
- `GET /users` - Liste paginée
- `PATCH /users/:id` - Update role/isActive
- `DELETE /users/:id` - Soft delete

### Samples
- `GET /samples/packs` - Liste packs
- `GET /samples/packs/:id` - Détail + folders
- `POST /samples/packs` - Créer pack
- `PUT /samples/packs/:id` - Update pack
- `DELETE /samples/packs/:id` - Supprimer (cascade)

- `GET /samples/packs/:packId/folders` - Folders d'un pack
- `POST /samples/packs/:packId/folders` - Créer folder
- `PUT /samples/folders/:id` - Update folder
- `DELETE /samples/folders/:id` - Supprimer (cascade)

- `GET /samples/folders/:folderId/samples` - Samples d'un folder
- `POST /samples/folders/:folderId/samples` - Créer sample
- `PUT /samples/samples/:id` - Update sample
- `DELETE /samples/samples/:id` - Supprimer

### Upload
- `POST /upload` - Upload fichier vers R2
  - `multipart/form-data` avec `file`, `packSlug`, `folderName?`
  - Retourne `{ filename, key, url, size, mimetype }`

## Stockage R2 (Cloudflare)

### Configuration (.env)
```
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=bloop-samples
CDN_BASE_URL=https://samples.bloop-on.cloud
```

### Structure des fichiers
```
R2 bucket: bloop-samples/
├── samples/
│   └── {packSlug}/
│       └── {folderName}/
│           └── {uuid}_{filename}.wav
```

### URL publique
Les samples sont servis via le CDN : `https://samples.bloop-on.cloud/samples/...`

Le champ `fullUrl` de chaque sample contient l'URL complète.

## Entités TypeORM (server)

### SamplePack
```typescript
@Entity("sample_packs")
{
  id: string (uuid)
  slug: string (unique, URL-friendly)
  name: string
  author?: string
  cover?: string
  featured: boolean
  isActive: boolean
  folders: SampleFolder[]
}
```

### SampleFolder
```typescript
@Entity("sample_folders")
{
  id: string (uuid)
  name: string
  order: number
  pack: SamplePack
  packId: string
  samples: AudioSample[]
}
```

### AudioSample
```typescript
@Entity("audio_samples")
{
  id: string (uuid)
  name: string
  filename: string
  duration: number
  waveform?: number[]
  folder: SampleFolder
  folderId: string
  previewUrl?: string
  fullUrl: string  // URL CDN obligatoire
}
```

## SampleUploader (non implémenté)

Composant drag & drop pour l'upload de samples individuels — décrit ci-dessous à titre de spec, mais n'existe pas dans le code actuel. Aujourd'hui, l'unique chemin d'upload est l'import bulk d'un pack complet via `ZipPackImporter.vue` (route `POST /upload` ci-dessus).

### Props
```typescript
packSlug: string      // Slug du pack (pour le path R2)
folderName?: string   // Nom du folder (pour le path R2)
folderId: string      // ID du folder (pour la création en DB)
```

### Emit
```typescript
emit('uploaded', sample)  // Quand un sample est créé
```

### Flow
1. User drop/sélectionne fichiers audio
2. Pour chaque fichier :
   - Upload vers R2 via `adminStore.uploadFile()`
   - Crée le sample en DB via `adminStore.createSample()`
   - Émet `uploaded` avec le sample créé
3. Progress bar pendant l'upload

## Points d'attention

### CORS R2
Le bucket R2 doit autoriser les origins :
- `http://localhost:3000` (dev)
- `https://bloop-on.cloud` (prod)
- `https://staging.bloop-on.cloud` (staging)

### Accès admin
- Route protégée par `role === "ROLE_ADMIN"`
- Middleware backend vérifie le rôle
- Bouton admin visible dans le header uniquement pour les admins

### Slug des packs
- Format: `[a-z0-9-]+`
- Utilisé pour l'URL et le path R2
- Non modifiable après création

## Conventions

- Couleurs : tokens CSS de `webapp/src/styles/colors.css` (`--color-accent2` pour le rose admin, `--color-bg-admin-surface` pour le fond des cards/tables/inputs, `--color-status-success`/`--color-status-error` pour les statuts actif/inactif) — pas de hex en dur, cf. `components/ui/`
- Composants partagés (`webapp/src/components/ui/`) : `BaseButton`, `BaseModal`, `BaseBadge`, `BaseSpinner`, `EmptyState`, `FormField`/`BaseInput`/`BaseSelect`
- Confirmation avant suppression/désactivation : `BaseModal`, plus de `confirm()` natif
- Toast/notifications : `useToast()` + `ToastContainer.vue` (monté dans `App.vue`)
