# Plugins VST/instruments célèbres dans Bloop — exploration & estimation de coûts

> Note d'exploration (pas une décision produit) — pour alimenter la réflexion équipe/PM sur un éventuel argument "pro"/upsell.

## Le problème de départ

Un plugin audio "classique" comme Serum, Kontakt ou FabFilter est un fichier `.vst`/`.dll` : du **code natif compilé** pour Windows/Mac. Un navigateur web ne peut exécuter que du JavaScript/WebAssembly, dans un bac à sable isolé — il ne peut pas lancer ce type de binaire, un peu comme un iPhone ne peut pas lancer un `.exe`. Ce n'est pas une limite de notre code, c'est une limite de plateforme : **aucune quantité de "code plus solide" ne changera ça**.

## Deux familles de plugins, deux approches différentes

### 1. Plugins "libres" (open source) → solution simple, quasi gratuite

Il existe un écosystème dédié au web : **WAM (Web Audio Modules)**, l'équivalent des VST mais pensé pour le navigateur. Deux options concrètes :

- Utiliser directement des plugins déjà disponibles dans la communauté WAM (une quarantaine de synthés/effets open source, prêts à intégrer)
- Recompiler le DSP (le moteur audio) d'un plugin open source existant vers WebAssembly, à condition d'avoir accès à son code source

**Résultat** : le plugin tourne entièrement dans le navigateur de l'utilisateur, en vrai temps réel, sans aucun serveur derrière. Pas de coût d'infra, pas de limite de nombre d'utilisateurs simultanés (chacun fait tourner sa propre copie chez lui, comme n'importe quelle page web).

**Recommandation** : c'est la voie à privilégier pour démarrer — bon rapport effort/résultat, crédibilise l'offre sans complexité serveur.

### 2. Plugins propriétaires célèbres (Serum, Kontakt, FabFilter...) → solution plus lourde

Là, on n'a pas le code source : impossible de le faire tourner dans le navigateur. La seule option est de faire tourner le **vrai plugin sur un serveur**, dans une machine/conteneur dédié, et de "streamer" le son (et les contrôles) vers le navigateur — un peu comme le cloud gaming (GeForce Now, Xbox Cloud) mais pour de l'audio.

Deux points bloquants à traiter en amont, indépendants de la technique :
- **Légal** : la plupart des licences de ces plugins interdisent explicitement ce genre d'usage "hébergé multi-utilisateurs" sans accord spécifique avec l'éditeur → nécessite un partenariat (hors sujet technique, déjà identifié comme à traiter côté business).
- **Un serveur par utilisateur actif** : un plugin garde en mémoire l'état de ce qui est en train d'être joué (notes, réglages) — il n'est pas possible de le faire partager en simultané par plusieurs utilisateurs différents. Chaque session active a besoin de sa propre instance.

Un compromis moins coûteux qu'un vrai streaming continu : au lieu de streamer le son en permanence, l'utilisateur règle les paramètres via une interface web, puis déclenche un court rendu (quelques secondes) à la demande — moins réactif, mais bien moins cher à héberger.

## Estimation de coût — cas Serum

Pourquoi Serum en exemple : c'est un synthé "wavetable", donc léger en mémoire (quelques centaines de Mo par instance) — contrairement à des instruments à base d'échantillons audio (type Kontakt) qui peuvent charger plusieurs Go de sons en mémoire par instance. C'est un des meilleurs candidats côté coût parmi les plugins "célèbres".

**Point important à corriger côté intuition** : pour ce type de charge (audio temps réel), ce n'est **pas la mémoire (RAM)** qui coûte cher, mais **le processeur (CPU)** — si le serveur est trop sollicité, le son "crache" (grésillements). C'est l'inverse de beaucoup d'autres charges informatiques où la RAM domine.

### Coût par utilisateur actif

| | |
|---|---|
| Ressources réservées par session active | ~1 cœur de processeur dédié + ~1,5-2 Go de RAM (marge de sécurité incluse) |
| Machine serveur type (exemple) | 4 cœurs / 16 Go, ~0,13 $/heure |
| Sessions simultanées par machine | ~3 (limité par le CPU, pas par la RAM) |
| **Coût par heure d'utilisation active** | **~0,045 $ / heure / utilisateur** |

### Projection mensuelle (exemple illustratif)

Hypothèse : 100 utilisateurs Pro, dont la moitié utilise la feature ~10h/mois.

| Poste | Coût mensuel estimé |
|---|---|
| Calcul (sessions actives, 500h × 0,045$) | ~22,5 $ |
| **"Pool chaud"** (serveurs maintenus allumés pour éviter un délai de démarrage de plusieurs secondes à chaque lancement) | ~48 $ |
| **Total** | **~70 $/mois** |

→ Soit environ **0,70 $/mois par utilisateur Pro inscrit**, ou **~1,40 $/mois par utilisateur qui utilise vraiment la feature**.

À comparer à un abonnement Pro typique (10-15 $/mois) : ça représente **~5-15% du prix de l'abonnement** pour cette seule feature — un coût notable mais absorbable, surtout si la feature est réservée à un palier supérieur ou plafonnée en heures/mois.

### Ce qui ferait vraiment grimper la facture

Le vrai risque de dérapage n'est pas le coût "brut" du calcul, mais deux facteurs :

1. **Le succès de la feature** : plus il y a d'utilisateurs simultanés, plus il faut de serveurs "chauds" prêts à l'emploi (le poste qui coûte déjà le plus, avant même l'usage réel) — ça ne grossit pas de façon linéaire et lisse, mais par paliers de machines.
2. **Le type de plugin ajouté ensuite** : le jour où l'on veut proposer un instrument à samples lourds (type Kontakt), le besoin en RAM par instance explose (plusieurs Go au lieu de quelques centaines de Mo) — le coût par utilisateur peut être multiplié par 5 à 10.

## En résumé

| | Plugins libres (WAM/WASM) | Plugins célèbres propriétaires (Serum, etc.) |
|---|---|---|
| Où ça tourne | Navigateur de l'utilisateur | Serveur dédié |
| Coût d'infra | ~Nul | Réel mais maîtrisable pour un synthé léger |
| Prérequis | Aucun (juste du dev) | Accord de licence avec l'éditeur + infra serveur |
| Recommandation | À démarrer en premier | Étape 2, une fois les partenariats en place |
