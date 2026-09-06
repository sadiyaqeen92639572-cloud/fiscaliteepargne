#!/usr/bin/env node
/* build.js — générateur "zero build côté hébergeur".
 * Rend chaque page de data/pages.json en HTML statique commité, + sitemap.xml + llms.txt.
 * Aucune dépendance npm. Lancer : `node build.js` avant chaque commit.
 *
 * Source unique de vérité des taux : assets/constants.json (injecté inline dans window.__CONSTS__).
 * Partials partagés : head / nav / fil d'Ariane / footer / eeat / FAQ.
 * Flag `published:false` => page générée + déployable mais hors sitemap/nav/footer + <meta robots noindex>. */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://fiscaliteepargne.fr';
const GSC_TAG = 'caSgQcg_w1P4XoH1sqJFEhnVhn2amES086r0kiv2MaU';
const FAVICON = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📈</text></svg>';

const C = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/constants.json'), 'utf-8'));
const PAGES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/pages.json'), 'utf-8'));

const pub = PAGES.filter(p => p.published !== false);
const url = slug => slug ? `${SITE}/${slug}/` : `${SITE}/`;

/* Ordre du menu principal (slugs). Filtré par published. */
const NAV = [
  ['', 'Accueil'],
  ['assurance-vie-fiscalite', 'Fiscalité assurance-vie'],
  ['pea', 'PEA'],
  ['compte-titres-fiscalite', 'Compte-titres (PFU)'],
  ['pea-ou-assurance-vie', 'PEA ou assurance-vie'],
  ['interet-compose', 'Intérêts composés'],
  ['methodologie', 'Méthodologie'],
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = s => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const exists = slug => pub.some(p => (p.slug || '') === slug);

/* ---------- Partials ---------- */

function navHtml(activeSlug) {
  const links = NAV.filter(([s]) => exists(s)).map(([s, label]) => {
    const href = s ? `/${s}/` : '/';
    const cur = (s === activeSlug) ? ' aria-current="page"' : '';
    return `<a href="${href}"${cur}>${esc(label)}</a>`;
  }).join('\n      ');
  return `<nav class="site-nav" aria-label="Navigation principale">
  <div class="container">
    <a href="/" class="nav-brand">📈 Fiscalité Épargne</a>
    <details><summary>Menu ▾</summary></details>
    <div class="nav-links">
      ${links}
    </div>
  </div>
</nav>`;
}

function crumbHtml(page) {
  if (!page.crumbs || !page.crumbs.length) return '';
  const parts = page.crumbs.map((c, i) => {
    if (i === page.crumbs.length - 1) return `<span>${esc(c[0])}</span>`;
    return `<a href="${c[1]}">${esc(c[0])}</a>`;
  });
  return `<nav class="breadcrumb" aria-label="Fil d'Ariane">${parts.join(' &rsaquo; ')}</nav>`;
}

function footerHtml() {
  const groups = {
    'Outils': ['', 'assurance-vie-fiscalite', 'pea', 'compte-titres-fiscalite', 'pea-ou-assurance-vie', 'interet-compose'],
    'Ressources': ['methodologie', 'changelog'],
    'Légal': ['about', 'privacy'],
  };
  const cols = Object.entries(groups).map(([title, slugs]) => {
    const items = slugs.filter(exists).map(s => {
      const p = pub.find(x => (x.slug || '') === s);
      const href = s ? `/${s}/` : '/';
      return `<li><a href="${href}">${esc(p.navLabel || p.h1 || title)}</a></li>`;
    }).join('');
    return items ? `<div><strong>${title}</strong><ul>${items}</ul></div>` : '';
  }).join('');
  return `<footer>
  <div class="container">
    <div class="footer-cols">${cols}</div>
    <p style="margin-top:16px;">Une initiative de <strong>Gesmine-Invest Limited</strong>, société enregistrée au Royaume-Uni (n° 14120136), siège social : Hardy House, 269 Poynders Gardens, Londres, SW4 8PQ.</p>
    <p style="margin-top:8px;font-size:.8rem;">Certaines pages contiennent des liens d'affiliation vers des courtiers ou banques en ligne : Gesmine-Invest Limited peut percevoir une commission si vous ouvrez un compte, sans coût supplémentaire pour vous. Site indépendant, non enregistré à l'ORIAS, ne délivrant aucun conseil personnalisé. L'investissement comporte un risque de perte en capital.</p>
    <p style="margin-top:8px;">© 2026 Gesmine-Invest Limited. Estimations à titre purement indicatif — ne remplacent pas un conseil personnalisé.</p>
  </div>
</footer>`;
}

function sourcesHtml(keys) {
  if (!keys || !keys.length) return '';
  const li = keys.map(k => {
    const s = C.sources[k];
    if (!s) return '';
    return `<li><a href="${s[1]}" rel="noopener nofollow" target="_blank">${esc(s[0])}</a></li>`;
  }).join('');
  return `<h3>Sources officielles</h3>\n<ul class="sources-list">${li}</ul>`;
}

function eeatHtml(page) {
  const rev = page.reviewedBy
    ? `<p class="reviewed-by">✔ Relu par ${esc(page.reviewedBy.name)}, ${esc(page.reviewedBy.role)}, le ${esc(page.reviewedBy.date)}.</p>`
    : '';
  return `<div class="eeat-section">
  <h2>Transparence, méthodologie &amp; sources</h2>
  <div class="eeat-author">
    <div class="avatar">FÉ</div>
    <div>
      <h4>La rédaction Fiscalité Épargne</h4>
      <div class="role">Équipe éditoriale — fiscalité de l'épargne</div>
      <p>Contenu rédigé à partir des textes officiels (LFSS 2026, Code général des impôts, BOFiP, service-public.fr). Les calculs sont déterministes : ils appliquent les taux et barèmes en vigueur, sans intelligence artificielle. Barèmes vérifiés le ${esc(C.verifie_le)} — <a href="/changelog/">journal des mises à jour</a>.</p>
      ${rev}
    </div>
  </div>
  <div class="eeat-compliance">
    <h4>Méthodologie &amp; limites</h4>
    <p>Voir la <a href="/methodologie/">méthodologie complète</a> (formules, hypothèses, cas non modélisés). Pour une simulation officielle, utilisez le simulateur de l'administration sur <a href="https://www.impots.gouv.fr/" rel="noopener nofollow" target="_blank">impots.gouv.fr</a>.</p>
    <h4>Conseil &amp; validation professionnelle</h4>
    <p>Gesmine-Invest Limited n'est pas enregistré à l'ORIAS et n'a pas le statut de conseiller en investissements financiers (CIF). Les résultats ne constituent pas un conseil personnalisé. Avant toute décision, consultez un conseiller en gestion de patrimoine (annuaire de la <a href="https://www.cncgp.fr/trouver-un-conseiller/" rel="noopener nofollow" target="_blank">CNCGP</a>) ou un avocat fiscaliste.</p>
    <h4>Code source auditable</h4>
    <p>Les formules sont publiques sur le <a href="https://github.com/sadiyaqeen92639572-cloud/fiscaliteepargne" rel="noopener nofollow" target="_blank">dépôt GitHub</a>.</p>
    ${page.sources ? sourcesHtml(page.sources) : ''}
  </div>
</div>`;
}

function faqHtml(faq) {
  if (!faq || !faq.length) return '';
  const items = faq.map(({ q, a }) => `  <div class="faq-item">
    <button class="faq-q" onclick="toggleFaq(this)">${esc(q)}</button>
    <div class="faq-a">${a}</div>
  </div>`).join('\n');
  return `<div class="eeat-section">
  <h2>Questions fréquentes</h2>
${items}
</div>`;
}

function relatedHtml(rel) {
  if (!rel || !rel.length) return '';
  const cards = rel.map(([href, label]) => `<a href="${href}">${esc(label)} →</a>`).join('\n    ');
  return `<div class="eeat-section">
  <h2>À lire aussi</h2>
  <div class="link-grid">
    ${cards}
  </div>
</div>`;
}

/* ---------- JSON-LD ---------- */

const ORG_NODE = {
  '@type': 'Organization',
  '@id': `${SITE}/#org`,
  name: 'Fiscalité Épargne',
  url: `${SITE}/`,
  legalName: 'Gesmine-Invest Limited',
  identifier: { '@type': 'PropertyValue', name: 'UK Company Number', value: '14120136' },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Hardy House, 269 Poynders Gardens',
    addressLocality: 'London', postalCode: 'SW4 8PQ', addressCountry: 'GB',
  },
  sameAs: ['https://github.com/sadiyaqeen92639572-cloud/fiscaliteepargne'],
};
const WEBSITE_NODE = {
  '@type': 'WebSite', '@id': `${SITE}/#website`,
  name: 'Fiscalité Épargne', url: `${SITE}/`, inLanguage: 'fr-FR',
  publisher: { '@id': `${SITE}/#org` },
};

function jsonLd(page) {
  const u = url(page.slug);
  const graph = [ORG_NODE, WEBSITE_NODE];

  const isArticle = page.eeat !== false && page.kind !== 'legal';
  graph.push({
    '@type': isArticle ? 'Article' : 'WebPage',
    '@id': `${u}#page`,
    url: u,
    name: page.title,
    headline: page.h1,
    description: page.desc,
    inLanguage: 'fr-FR',
    isPartOf: { '@id': `${SITE}/#website` },
    ...(page.datePublished ? { datePublished: page.datePublished } : {}),
    dateModified: page.dateModified || C.verifie_le,
    ...(isArticle ? {
      author: { '@type': 'Organization', name: 'La rédaction Fiscalité Épargne', url: `${SITE}/about/` },
      publisher: { '@id': `${SITE}/#org` },
    } : {}),
    ...(page.about ? { about: { '@type': 'DefinedTerm', name: page.about } } : {}),
    ...(page.reviewedBy ? {
      reviewedBy: { '@type': 'Person', name: page.reviewedBy.name, jobTitle: page.reviewedBy.role },
    } : {}),
  });

  if (page.crumbs && page.crumbs.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: page.crumbs.map((c, i) => ({
        '@type': 'ListItem', position: i + 1, name: c[0],
        item: i === page.crumbs.length - 1 ? u : `${SITE}${c[1]}`,
      })),
    });
  }
  if (page.faq && page.faq.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: page.faq.map(({ q, a }) => ({
        '@type': 'Question', name: q,
        acceptedAnswer: { '@type': 'Answer', text: plain(a) },
      })),
    });
  }
  if (page.calc) {
    graph.push({
      '@type': 'WebApplication', name: page.h1, url: u,
      applicationCategory: 'FinanceApplication', operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      areaServed: 'FR', publisher: { '@id': `${SITE}/#org` },
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
}

/* ---------- Calculateurs (markup + script) ---------- */

const CALC = require('./data/calc-widgets.js');

/* ---------- Table des constantes (homepage) ---------- */

function constTableHtml() {
  const rows = C.table.map(r => {
    const src = C.sources[r.source];
    const link = src ? `<a href="${src[1]}" rel="noopener nofollow" target="_blank">${esc(src[0].split(' — ')[0])}</a>` : esc(r.source);
    return `<tr><td>${r.label}</td><td>${r.value}</td><td>${link}</td><td class="rate-note">${esc(r.revise_le)}</td></tr>`;
  }).join('\n        ');
  return `<div class="overflow-wrap">
    <table class="const-table">
      <thead><tr><th>Paramètre fiscal</th><th>Valeur 2026</th><th>Source</th><th>Révisé le</th></tr></thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    </div>`;
}

/* ---------- Assemblage d'une page ---------- */

function render(page) {
  const u = url(page.slug);
  const active = page.slug || '';
  const ogType = page.wide ? 'website' : 'article';
  const noindex = page.published === false ? '\n<meta name="robots" content="noindex">' : '';
  const needsCalc = !!page.calc;

  const sections = (page.sections || [])
    .map(s => s === '@CONST_TABLE@'
      ? `<div class="eeat-section"><h2>Comment fonctionne ce comparateur — taux &amp; constantes 2026</h2><p><em>Source : LFSS 2026 · service-public.fr · Légifrance · calculs déterministes (sans IA).</em></p>${constTableHtml()}</div>`
      : s)
    .join('\n\n  ');

  const head = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.desc)}">${noindex}
${page.slug === '' ? `<meta name="google-site-verification" content="${GSC_TAG}" />\n` : ''}<link rel="canonical" href="${u}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.desc)}">
<meta property="og:url" content="${u}">
<meta property="og:site_name" content="Fiscalité Épargne">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1e40af">
<link rel="stylesheet" href="/assets/style.css">
<link rel="icon" href="${FAVICON}">
<script>window.__CONSTS__=${JSON.stringify(C)};</script>
${needsCalc ? '<script src="/assets/calculators.js" defer></script>\n' : ''}<script type="application/ld+json">
${jsonLd(page)}
</script>
</head>
<body>`;

  const header = `<header>
  <div class="container">
    ${page.flag !== false ? `<span class="flag">${page.flag || '🇫🇷'}</span>` : ''}
    <h1>${esc(page.h1)}</h1>
    <p>${esc(page.heroSub || '')}</p>
    ${page.slug === '' ? '<span class="badge" id="date-badge">Source : LFSS 2026</span>' : ''}
  </div>
</header>`;

  const disc = page.disclaimer ? `<div class="disclaimer-banner">${page.disclaimer}</div>\n\n  ` : '';
  const calcBlock = needsCalc ? (CALC.markup[page.calc] || '') + '\n\n  ' : '';
  const eeat = page.eeat === false ? '' : eeatHtml(page) + '\n\n  ';
  const related = relatedHtml(page.related);
  const faq = faqHtml(page.faq);
  const calcScript = needsCalc ? `\n<script>\n${CALC.script[page.calc] || ''}\n</script>` : '';
  const homeScript = page.slug === '' ? `\n<script>window.addEventListener('DOMContentLoaded',function(){document.getElementById('date-badge').textContent='Vérifié le '+window.__CONSTS__.verifie_le+' — '+window.__CONSTS__.source_principale;});</script>` : '';

  return `${head}
${navHtml(active)}
${header}

<main class="container">
  ${crumbHtml(page)}
  ${disc}${calcBlock}${sections}${sections ? '\n\n  ' : ''}${faq ? faq + '\n\n  ' : ''}${eeat}${related}
</main>

${footerHtml()}
<script>
function toggleFaq(b){b.classList.toggle('open');b.nextElementSibling.classList.toggle('open');}
</script>${calcScript}${homeScript}
</body>
</html>
`;
}

/* ---------- Écriture ---------- */

let count = 0;
for (const page of PAGES) {
  const dir = page.slug ? path.join(ROOT, page.slug) : ROOT;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), render(page));
  count++;
  console.log(`  ✓ /${page.slug ? page.slug + '/' : ''}${page.published === false ? '  (published:false — noindex, hors sitemap)' : ''}`);
}

/* sitemap.xml — pages publiées uniquement */
const PRIO = { '': '1.0' };
const sm = pub.map(p => {
  const prio = p.priority || PRIO[p.slug || ''] || '0.7';
  return `  <url>
    <loc>${url(p.slug)}</loc>
    <lastmod>${p.dateModified || C.verifie_le}</lastmod>
    <changefreq>${p.changefreq || 'monthly'}</changefreq>
    <priority>${prio}</priority>
  </url>`;
}).join('\n');
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm}\n</urlset>\n`);
console.log(`  ✓ sitemap.xml (${pub.length} URL)`);

/* llms.txt */
const llms = `# Fiscalité Épargne — contexte LLM

Comparateur de la fiscalité des enveloppes d'épargne françaises (PEA, assurance-vie, CTO), basé sur la LFSS 2026 (adoptée le 16/12/2025). Vérifié le ${C.verifie_le}.

## Taux 2026
- PFU (flat tax) global CTO / dividendes / plus-values mobilières : ${(C.pfu.global_pea_cto * 100).toString().replace('.', ',')} % (IR 12,8 % + PS 18,6 %).
- Prélèvements sociaux PEA & CTO : 18,6 % (hausse LFSS 2026, ex-17,2 %).
- Prélèvements sociaux assurance-vie : 17,2 % (maintenus — hors champ de la hausse).
- Assurance-vie > 8 ans : abattement ${C.assurance_vie.abattement_annuel_seul} € (seul) / ${C.assurance_vie.abattement_annuel_couple} € (couple) ; IR 7,5 % jusqu'à 150 000 € de primes, 12,8 % au-delà.
- Assurance-vie < 8 ans : PFU 30 % (IR 12,8 % + PS 17,2 %).
- Plafond PEA : ${C.pea.plafond_versements} € ; PEA + PEA-PME cumulés : ${C.pea.plafond_pea_pme} €.

## Pages
${pub.map(p => `- ${url(p.slug).replace(SITE, '')} — ${p.navLabel || p.h1}`).join('\n')}

Toutes les données proviennent des textes officiels et ne constituent pas un conseil en investissement.
`;
fs.writeFileSync(path.join(ROOT, 'llms.txt'), llms);
console.log('  ✓ llms.txt');
console.log(`\n${count} pages générées.`);
