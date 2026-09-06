# Comparateur Fiscalité Épargne 2026 🇫🇷

[![Déployé sur Cloudflare Pages](https://img.shields.io/badge/Deploy%C3%A9%20sur-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare)](https://fiscaliteepargne.fr)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript)](#)
[![Zero Build Step](https://img.shields.io/badge/Architecture-Zero%20Build%20Step-000000?style=for-the-badge)](#)

Bienvenue sur le dépôt source de **[Fiscalité Epargne](https://fiscaliteepargne.fr)**, le comparateur d'enveloppes fiscales françaises (PEA, Assurance-Vie, CTO) basé sur les règles de la Loi de Financement de la Sécurité Sociale (LFSS) 2026.

## 🚀 La philosophie technique : La puissance du "Zero Build Step"

Dans un écosystème web souvent dominé par des frameworks lourds (React, Vue, Next.js) et des chaînes de compilation complexes (Webpack, Vite), ce projet a fait un choix radical : **le retour aux sources**. 

L'architecture de `fiscaliteepargne.fr` est **statique côté hébergeur** : Cloudflare Pages sert directement le HTML commité, sans aucune étape de build. Les pages sont générées en local par `build.js` à partir de `data/pages.json` (contenu) et `assets/constants.json` (taux, source unique de vérité), puis committées. Lancer `node build.js` avant chaque commit ; aucune dépendance npm.

### Pourquoi ce choix technique ?

1. **Performances foudroyantes (Core Web Vitals)** : Sans JavaScript lourd à parser (ni virtual DOM), la page se charge instantanément. Les indicateurs LCP (Largest Contentful Paint) et INP (Interaction to Next Paint) sont optimisés au maximum.
2. **Durabilité et maintenance** : Ce code fonctionnera dans 10 ans sans nécessiter la mise à jour d'un fichier `package.json` ou la résolution de failles de dépendances npm (CVE).
3. **Sécurité maximale** : Aucune dépendance externe signifie une surface d'attaque réduite à zéro.
4. **Déploiement ultra-rapide** : L'intégration avec Cloudflare Pages se fait en quelques secondes, sans aucun temps de "build".

## 🛠️ Stack Technique & SEO

Bien que minimaliste, le projet intègre les standards les plus modernes du web :

### 1. HTML5 Sémantique & CSS3 Mobile-First
Le site utilise un balisage HTML sémantique strict (`<main>`, `<header>`, `<article>`) garantissant une accessibilité parfaite. Le design CSS utilise des variables natives (CSS Custom Properties) pour la gestion du thème et CSS Grid/Flexbox pour un rendu totalement responsive.

### 2. Vanilla JavaScript (ES6+)
Le moteur de calcul (fichier `calculators.js`) est écrit en pur JavaScript. Il utilise la destructuration, les promesses (`async/await`) et l'API Fetch pour charger dynamiquement les constantes fiscales depuis un fichier `constants.json`. 
*Avantage* : Les règles métiers (taux, abattements) sont découplées du code logique. Mettre à jour un taux pour la LFSS de l'année suivante se fait sans toucher à l'algorithme.

### 3. Données Structurées JSON-LD (Schema.org)
Le SEO technique a été poussé à son maximum. Chaque page génère dynamiquement (ou statiquement) des balises JSON-LD incluant :
- `@type: WebApplication` pour identifier le comparateur.
- `@type: Organization` pour l'autorité légale et l'E-E-A-T (Expertise, Authoritativeness, Trustworthiness).
- `@type: FAQPage` pour accrocher les résultats enrichis (Rich Snippets) sur Google.
- `@type: BreadcrumbList` pour le maillage sémantique.

### 4. Cloudflare Pages
L'hébergement repose sur l'infrastructure Edge de Cloudflare. Les fichiers statiques sont distribués sur des centaines de serveurs dans le monde, garantissant une latence minimale et une résilience totale aux pics de trafic.

## 📂 Structure du projet

```text
/
├── build.js                   # Générateur (local, zéro dépendance)
├── data/
│   ├── pages.json             # Contenu de toutes les pages (sections, FAQ, méta)
│   └── calc-widgets.js        # Markup + script de chaque calculateur
├── assets/
│   ├── constants.json         # Taux + table datée + sources (source unique de vérité)
│   ├── calculators.js         # Moteur déterministe (fmtEUR, imposeApres8Ans, calculAvRachat…)
│   └── style.css              # Design system + breakpoints
├── index.html                 # Hub + comparateur 3 enveloppes            ┐
├── pea/                        # Fiscalité du PEA                          │
├── assurance-vie-fiscalite/   # Fiscalité de l'assurance-vie (+ apres-8-ans/) │ générés
├── pea-ou-assurance-vie/      # Comparatif PEA vs AV (prospectif)         │ par
├── compte-titres-fiscalite/   # PFU / barème progressif CTO               │ build.js
├── interet-compose/           # Calculatrice d'intérêts composés          │
├── methodologie/ changelog/ about/ privacy/                              ┘
├── llms.txt  sitemap.xml      # émis par build.js
└── wrangler.toml              # Cloudflare Pages (pages_build_output_dir = ".")
```

> `assurance-vie-fiscalite/` et `assurance-vie-fiscalite/apres-8-ans/` sont générées avec
> `published:false` (méta `robots noindex`, hors sitemap et navigation) en attendant une
> relecture par un professionnel (CGP / avocat fiscaliste) avant mise en index.

## ⚖️ Avertissement Légal

Ce simulateur est fourni à des fins **strictement pédagogiques**. Il modélise l'hypothèse d'un versement unique à la date du calcul. Il ne remplace en aucun cas un conseil patrimonial personnalisé (ORIAS) et ne constitue pas un calcul fiscal exhaustif.

---
*© 2026 Gesmine-Invest Limited. Développé pour la transparence de l'épargne.*
