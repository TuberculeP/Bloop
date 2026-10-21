# Migrations TypeORM

En Postgres (staging/prod), `synchronize` est désactivé : le schéma n'évolue que par les migrations de ce dossier.
En dev local sur SQLite (pas de `POSTGRES_URL`), le schéma reste synchronisé depuis les entités, sans migrations.

## Workflow quand on modifie une entité

```bash
npm run migration:db:start                                          # Postgres jetable sur localhost:5433
npm run migration:generate -- server/src/config/migrations/AddFooToUser
npm run migration:db:stop
```

`migration:generate` applique d'abord les migrations existantes sur le Postgres jetable, puis compare les entités au schéma obtenu. Il écrit uniquement le diff dans un nouveau fichier. **Relire la migration générée** avant de la commiter.

Les commandes de dev (`migration:run`, `migration:generate`, `migration:revert`) passent par `migration.local.datasource.ts`. Elles ciblent **toujours** le Postgres jetable et ignorent `POSTGRES_URL` : impossible de toucher staging ou la prod depuis ton poste. Seul `migration:run:prod` (au déploiement) utilise `POSTGRES_URL`, via `migration.datasource.ts`.

On ne génère jamais une migration depuis une base réelle (staging, prod) : les migrations suivent le code dans Git, et chaque environnement applique celles qu'il n'a pas encore exécutées. Une prod en retard sur staging rejoue donc exactement les mêmes scripts au merge vers `main`. Une migration déjà appliquée quelque part ne se modifie plus : on en crée une nouvelle.

### Limites de `migration:generate`

- **Suppression d'entité** : TypeORM ignore les tables qu'il ne connaît pas et ne génère jamais de `DROP TABLE`. Il faut écrire une migration à la main (`npm run migration:create -- server/src/config/migrations/<Nom>`) qui appelle `queryRunner.dropTable(nom, true, true, true)`, en supprimant les tables de jointure avant les tables parentes.
- **Renommage de colonne** : TypeORM le voit comme une suppression suivie d'un ajout, et les données de la colonne sont perdues. Remplacer à la main par un `ALTER TABLE ... RENAME COLUMN`.

## Déploiement

Les migrations ne tournent pas dans le code de l'app. C'est le `CMD` du `Dockerfile` qui les lance au démarrage du nouveau conteneur, avant l'app :

```bash
npm run migration:run:prod && npm start
```

- Chaque migration exécutée est enregistrée dans `migration_table`, donc une migration ne s'exécute qu'une seule fois.
- En cas d'échec, la transaction est annulée, le conteneur s'arrête et Coolify garde l'ancienne version.
- On n'utilise pas la « Pre-deployment command » de Coolify : elle tourne dans le conteneur encore en ligne (l'ancienne image), qui ne contient pas les nouvelles migrations.
- Pendant le rolling update, l'ancienne version tourne brièvement sur le nouveau schéma. Il faut donc écrire des migrations rétrocompatibles : ajouter une colonne nullable, puis la supprimer dans un déploiement suivant plutôt que de la renommer.

`npm run migration:revert` annule la dernière migration (dev uniquement).

## Baseline

`*-InitialSchema.ts` contient le schéma complet au moment de la bascule depuis `synchronize`. Sur une base existante (table `user` présente), elle ne fait rien et est simplement marquée comme exécutée. Sur une base vide, elle crée tout.
