# Preview audio des liens partageables : où et comment rendre le MP3

> Note d'exploration, pas une décision. Elle sert à choisir l'architecture avant de toucher à l'export et au partage.

## Le besoin

Un lien partageable doit pouvoir lire une preview du morceau, sans ouvrir le DAW. Il faut donc un fichier audio (MP3) à jour, stocké sur R2. Il est généré quand le projet est publié ou mis à jour.

Le son doit être **identique** à ce que l'utilisateur entend dans le DAW : mêmes instruments, mêmes effets, même mixage.

## Contrainte technique : l'engine dépend du navigateur

L'engine audio repose sur la **Web Audio API**, qui n'existe que dans les navigateurs :

- **Nodes natifs** : `BiquadFilter`, `Convolver` (reverb), `DynamicsCompressor`, oscillateurs, lecteurs de buffers.
- **AudioWorklets** : le synthé FM ([fm-synth-processor.ts](../webapp/src/lib/audio/engines/fm-synth/fm-synth-processor.ts)) et le stretch SoundTouch ([stretchEngine.ts](../webapp/src/lib/audio/engines/stretchEngine.ts)).
- **APIs navigateur ailleurs** :
  - `smplr` passe par `fetch` et Cache Storage ;
  - Undertale remplace `window.fetch` ;
  - les caches de samples sont dans IndexedDB ;
  - les engines sont pilotés depuis les stores Pinia.

Node.js n'a rien de tout ça nativement.

## Options étudiées

### A. Rendu dans Node.js pur (`node-web-audio-api`)

Une implémentation de Web Audio en Rust, utilisable depuis Node.

| Pour | Contre |
|------|--------|
| Pas de navigateur côté serveur, léger | **Son pas identique** : Convolver, compresseur et filtres n'ont pas exactement la même implémentation que Chrome |
| | Support des AudioWorklets partiel, à vérifier version par version (FM, stretch) |
| | Il faudrait adapter `smplr`, Undertale, IndexedDB, `fetch`, Pinia… et maintenir ces adaptations à chaque évolution de l'engine |

**Verdict** : à éviter. On maintiendrait deux engines qui divergeraient avec le temps, et la preview ne sonnerait pas comme le DAW.

### B. Rendu côté client, à la publication

Le navigateur de l'utilisateur rend le morceau dans un `OfflineAudioContext`, encode le MP3 et l'envoie sur R2.

| Pour | Contre |
|------|--------|
| Son exactement identique, c'est le même navigateur et le même code | Consomme le CPU de l'utilisateur quelques secondes au moment de publier |
| Samples et soundfonts déjà chargés | Ne couvre pas les projets modifiés sans navigateur (ex : serveur MCP `bloop`) |
| Coût serveur nul, aucune infra à ajouter | Le fichier vient du client : il faut le valider côté serveur |
| `OfflineAudioContext` rend plus vite que le temps réel | |

### C. Worker serveur avec Chromium sans affichage (Playwright / Puppeteer)

Un worker backend ouvre une page de rendu dédiée, construite avec le même bundle. Il lance le rendu dans un `OfflineAudioContext` et récupère le MP3.

| Pour | Contre |
|------|--------|
| Même code et même son que le DAW | Lourd : environ 300 à 500 Mo de RAM par rendu, Chromium dans l'image Docker |
| Fonctionne pour tout projet, même modifié sans navigateur | File d'attente et limite de rendus simultanés à gérer (Coolify) |
| Pas de confiance à accorder au client | Temps de démarrage du navigateur (quelques secondes) |

## Recommandation

**Un seul engine, capable de rendre hors ligne, exécuté dans un navigateur.** Ce navigateur est celui de l'utilisateur par défaut, et Chromium côté serveur en secours. On n'écrit jamais un deuxième engine pour Node.

### Étape 1 : un rendu indépendant du contexte audio (prérequis)

Une fonction du type `renderProject(project, ctx: BaseAudioContext): Promise<AudioBuffer>` :

- elle reçoit le contexte audio en paramètre au lieu du contexte global de `audioBusStore` ;
- elle ne dépend ni de Pinia ni de `window` : les samples et soundfonts lui sont fournis par une fonction de chargement injectée (un fetch CDN côté serveur, le cache IndexedDB côté client) ;
- elle programme tout le morceau d'un coup, ce que permet déjà le `when` accepté par les engines (scheduler sur l'horloge audio, voir [components/app/CLAUDE.md](../webapp/src/components/app/CLAUDE.md)) ;
- elle sert aussi à l'export WAV/MP3 local, qui devient plus rapide que le temps réel et ne dépend plus de la capture `ScriptProcessorNode`.

C'est le chantier « export via `OfflineAudioContext` » de la feuille de route engine. Il est utile même sans le partage.

### Étape 2 : rendu côté client à la publication

1. L'utilisateur crée ou met à jour un lien de partage.
2. Le navigateur appelle `renderProject` dans un `OfflineAudioContext`, encode en MP3 et envoie le fichier.
3. Le backend valide le fichier (type, taille, durée cohérente avec le projet), le stocke sur R2 et l'associe à la version du projet.

### Étape 3 (optionnelle) : worker Chromium en secours

À mettre en place seulement si les modifications sans navigateur deviennent un vrai usage (MCP, API), ou si on a besoin de régénérer toutes les previews d'un coup.

- Une page de rendu minimale, sans l'UI du DAW, qui expose `renderProject`.
- Une file de jobs côté backend avec une limite de rendus simultanés.
- Le même endpoint de stockage que l'étape 2.

## Points d'attention

- **Quand déclencher** : pas à chaque sauvegarde automatique. Seulement à la publication ou mise à jour d'un lien de partage, ou après un délai sans modification.
- **Éviter les rendus inutiles** : calculer une empreinte du contenu qui influence le son (notes, clips, instruments, effets, automation, tempo, signature). Si elle n'a pas changé, on garde le MP3 existant.
- **Rendu reproductible** : la réponse impulsionnelle de la reverb est générée avec `Math.random()` ([config.ts](../webapp/src/lib/audio/config.ts), `createImpulseResponse`). Il faut un générateur à graine fixe, sinon deux rendus du même projet diffèrent.
- **Validation serveur** : ne pas faire confiance au MP3 envoyé par le client. Vérifier le type MIME réel, la taille maximale, et une durée proche de celle attendue.
- **Fin du morceau** : prévoir une courte queue après la dernière note (release, reverb) pour ne pas couper le son net.
- **Métronome** : jamais inclus dans le rendu (c'est déjà le cas, il ne passe pas par le bus master).
- **Quotas** : compter les previews dans le stockage R2 de l'utilisateur, ou les plafonner (une seule preview par projet partagé).

## Questions ouvertes

- Preview du morceau entier, ou d'un extrait (par exemple 30 s) pour limiter la taille et le temps de rendu ?
- Qualité MP3 visée (128 ou 192 kbps) ?
- Le lien affiche-t-il la preview de la dernière version publiée, ou de la dernière version sauvegardée ?
