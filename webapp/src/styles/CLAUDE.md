# Design System - Documentation Technique

> Système de style actuel et garde-fous à respecter avant d'écrire du CSS.

## Intention

Le style de l'app repose sur du **CSS scoped Vue (`<style scoped>`) + custom properties CSS** (`webapp/src/styles/colors.css`), pas sur des classes utilitaires.

Tailwind v4 est installé et branché (`@tailwindcss/vite`, bloc `@theme` dans `webapp/src/styles/tailwind.css`) mais **n'est pas utilisé dans le code** (0 fichier avec une classe utilitaire Tailwind en template). Ne pas introduire de classes Tailwind sans décision explicite — ça créerait un mélange de deux systèmes de style incohérent. Le bloc `@theme` ne couvre d'ailleurs que ~60% des tokens de `colors.css` (pas les variantes hover/active, pas les triplets RGB, pas les tokens DAW/Landing).

**Avant d'écrire du CSS** : vérifier ci-dessous si un token/composant existe déjà plutôt que d'inventer une couleur, un radius ou un pattern.

## Tokens couleur (`webapp/src/styles/colors.css`)

Chaque couleur a généralement un trio Default/Hover/Active, et parfois une variante `-rgb` (triplet `r, g, b` pour `rgba(var(--x-rgb), alpha)`).

### Marque
| Token | Valeur | Usage |
|---|---|---|
| `--color-primary(-hover/-active)` | `#440319` / `#60112c` / `#320917` | Couleur de marque principale (bordeaux) |
| `--color-secondary(-hover/-active)` | `#ffb2ae` / `#ffccc9` / `#eb8e89` | Couleur de marque secondaire (rose clair) |
| `--color-accent(-hover/-active)` | `#fff7ab` / `#fff16e` / `#e9dd64` | Accent jaune pâle |
| `--color-accent2(-hover/-active)` | `#ff3fb4` / `#ff62c2` / `#ed2aa1` | Accent rose vif (admin, badges featured) |
| `--color-accent3(-hover/-active)` | `#7a0f3e` / `#9b2458` / `#b2175b` | Accent bordeaux vif (DAW, boutons ghost) |
| `--color-black(-hover/-active)` | `#232323` / `#1c1c1c` / `#1c1c1c` | Noir de marque |
| `--color-white(-hover/-active)` | `#f2efe8` / `#e9e7e2` / `#f7f1e3` | Blanc cassé de marque |
| `--color-white-light` | `#f2efe8` | Alias de `--color-white` |
| `--color-text-secondary` | `#888` | Texte atténué (sous-titres, séparateurs) |

### Statuts / erreurs (plusieurs nuances de rouge, pas interchangeables)
| Token | Valeur | Usage |
|---|---|---|
| `--color-success/-hover/-active` | `#c77dff`/`#d49bff`/`#bb64fe` | Teinte "succès" de la **palette de marque** (violet) |
| `--color-validate/-hover/-active` | `#fff07a`/`#fff397`/`#fbe962` | Teinte "validation" de marque (jaune) |
| `--color-error/-hover/-active` | `#d7266d`/`#d53777`/`#b31353` | Teinte "erreur" de marque (rose/rouge) |
| `--color-warning/-hover/-active` | `#ffb703`/`#ffcb49`/`#c99000` | Teinte "warning" de marque (orange) |
| `--color-status-success` / `--color-status-error(-rgb)` | `#22c55e` / `#ef4444` | Vert/rouge **littéraux** de statut (actif/inactif, booléens) — distincts de success/error ci-dessus |
| `--color-error-light(-rgb)` | `#ff6b6b` | Rouge "erreur de formulaire" léger (messages de validation) |
| `--color-danger-hover(-rgb)` | `#e25555` | Rouge "danger" pour états favori/suppression au survol |

### Fonds
| Token | Valeur | Usage |
|---|---|---|
| `--color-bg-primary/-secondary/-accent(2/3)/-success/-validate/-error/-warning` | voir fichier | Fonds clairs teintés (rarement utilisés, thème sombre dominant) |
| `--color-bg-*-dark` (mêmes suffixes) | voir fichier | Fonds sombres teintés, thème principal de l'app |
| `--color-bg-surface-deep` | `#2a1520` | Fond cards/tables/inputs (admin), panneau audiothèque DAW |
| `--color-bg-daw-active` / `-deep` / `-dropdown` | `#3d1528` / `#160b12` / `#2a1020` | Fonds spécifiques DAW (piste active, spacers, dropdowns) |
| `--color-piano-key-black` | `#2a2a2a` | Touches noires du piano roll |
| `--color-audio-clip-selected` | `#fbbf24` | Bordure clip audio sélectionné/survolé |
| `--color-landing-bg(-rgb)` | `#060b17` | Fond "navy" propre à la landing page (distinct de la charte app) |

### Bordures
| Token | Valeur |
|---|---|
| `--color-border-secondary(-hover)` | `rgba(122, 15, 62, 0.5)` / `rgba(155, 36, 88, 0.7)` |

### Radius / Shadow
| Token | Valeur |
|---|---|
| `--radius-sm/md/lg/xl` | `4px` / `8px` / `12px` / `16px` |
| `--radius-full` | `50%` |
| `--shadow-sm/md/lg` | `0 2px 8px rgba(0,0,0,.15)` / `0 4px 12px rgba(0,0,0,.3)` / `0 12px 24px rgba(0,0,0,.4)` |

⚠️ `border-radius: 4px/8px/12px/16px` en valeur brute est **bloqué par stylelint** (voir plus bas) — toujours passer par `var(--radius-*)`.

### Classes utilitaires existantes (peu utilisées, éviter d'en ajouter)
`colors.css` expose aussi des classes `.color-*`, `.bg-*`, `.bg-layout-*`, `.border-*` en complément des tokens — quasi jamais utilisées dans le code actuel (tout passe par `var()` direct dans les `<style>` scoped des composants). Ne pas s'appuyer dessus pour du nouveau code, préférer `var(--color-*)` directement.

## Composants UI partagés (`webapp/src/components/ui/`)

Toujours vérifier ici avant de recoder un bouton/modal/badge/etc. en local.

| Composant | Props clés | Usage |
|---|---|---|
| `BaseButton` | `variant` (primary/secondary/accent/accent2/error/link/ghost/lightghost/lightlink/outline/danger/success), `size` (small/normal/large), `disabled`, `loading` | Tous les boutons |
| `BaseModal` | `modelValue`, `size` (small/normal/large), `closeOnOverlayClick` — slots `header`/défaut/`footer` | Toutes les modales/confirmations (remplace `confirm()`) |
| `BaseBadge` | `variant` (admin/active/featured/inactive/owner/neutral), `size` (small/normal) | Badges de statut |
| `BaseSpinner` | `size` (small/normal/large), `color` (primary/white/accent2/accent3) | Indicateurs de chargement |
| `EmptyState` | `icon`, `title`, `message` — slot par défaut + slot `action` | États vides (listes/résultats sans contenu) |
| `FormField` | `label`, `htmlFor`, `error` — wrap un champ | Label + erreur autour d'un input/select/textarea |
| `BaseInput` | `type`, `placeholder`, `required`, `disabled`, `id`, `v-model` (string/number) | Champs texte |
| `BaseSelect` | `options: {value,label}[]`, `disabled`, `id`, `v-model` | Selects |
| `RangeSlider` | `modelValue`, `min`, `max`, `step`, `unit`, `displayValue`, `thumbSize` | Sliders (volume, EQ, etc.) |
| `BaseTooltip` | `text`, `position` (top/bottom) — wrap un élément via slot | Tooltips au survol |

## Composables partagés (`webapp/src/composables/`)

| Composable | Rôle |
|---|---|
| `useToast()` | Notifications succès/erreur/info — remplace `alert()`/messages inline. `toast.success(msg)`/`toast.error(msg)`/`toast.info(msg)` |
| `useDropdown()` | État `{ isOpen, open, close, toggle }` pour tout menu/dropdown avec `v-on-click-outside` (`@vueuse/components`) |
| `useResizablePanel({ storageKey, defaultWidth, minWidth, maxWidth })` | Panneau redimensionnable à la souris, largeur persistée (`{ width, isResizing, startResize }`) |

## Garde-fous stylelint (`.stylelintrc.json`, racine du repo)

Ces règles sont en **erreur bloquante** (pas juste un warning) :
- `color-no-hex` : aucune couleur hex en dur dans un `<style>`, doit passer par `var(--color-*)`
- `declaration-no-important` : pas de `!important` sauf nécessité réelle démontrée
- `declaration-property-value-disallowed-list` sur `border-radius` : les valeurs `4px`/`8px`/`12px`/`16px` en dur sont interdites, utiliser `var(--radius-*)`

**Exception justifiée** (couleur vraiment unique/décorative, `!important` réellement nécessaire) : poser un commentaire avec raison, sur le modèle des ~21 exceptions déjà dans le repo :
```css
/* stylelint-disable-next-line color-no-hex -- <raison précise> */
background-color: #1f1f1f;
```
Pour un bloc de plusieurs lignes : `stylelint-disable <règle> -- <raison>` ... `stylelint-enable <règle>`.

Ne jamais désactiver une règle "parce que c'est plus simple" — seulement quand la couleur/valeur est légitimement hors charte (mockup illustratif, charte tierce type bouton Google, réalisme visuel type touches de piano).

**Piège** : ces règles ne voient que les blocs `<style>` (`postcss-html`). Un hex dans un `<script>` (canvas `fillStyle`, constante JS) n'est PAS détecté — vérifier à la main si une constante JS duplique une valeur de `colors.css`.

## Breakpoints

Convention : `@media (max-width: 768px)` (tablette) et `@media (max-width: 480px)` (mobile), en dur dans chaque fichier — **pas** de token CSS pour ça : les tokens `--breakpoint-*` du bloc Tailwind `@theme` ne sont utilisables que via des classes Tailwind, pas dans un `@media` CSS classique (`var()` non supporté dans une condition de media query).

La zone Blog (`BlogContain.vue`, `styles/blog.css`, `BlogTopLikedUsers.vue`, `BlogPosts.vue`) a une cascade volontaire à 4 paliers (1200/1024/768/640px, commentée dans le code) pour un layout 3 colonnes qui se replie progressivement — ne pas la "simplifier" vers 2 paliers, ce n'est pas une incohérence.

## Composants avec palette JS dédiée (hors design system, normal)

`lib/audio/config.ts` (`EQ_BAND_COLORS`) et `lib/utils/types.ts` (`TRACK_COLORS`) définissent leurs propres palettes hex, volontairement indépendantes de la charte de marque (couleurs par bande EQ / par piste). Ne pas essayer de les faire correspondre aux tokens `colors.css`.
