/* Moteur de calcul — fiscalité des enveloppes d'épargne (LFSS 2026).
 * Constantes : injectées par build.js dans window.__CONSTS__ (aucun fetch au runtime).
 * Fallback fetch conservé pour un usage hors-build ; branche Node pour test.js. */

let CONSTANTS = null;

async function loadConstants() {
    if (CONSTANTS) return CONSTANTS;
    if (typeof window !== 'undefined') {
        if (window.__CONSTS__) { CONSTANTS = window.__CONSTS__; return CONSTANTS; }
        const res = await fetch('/assets/constants.json');
        CONSTANTS = await res.json();
    } else {
        const fs = require('fs');
        const path = require('path');
        CONSTANTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'constants.json'), 'utf-8'));
    }
    return CONSTANTS;
}

/* Formatage monétaire français : "1 234 €" (et non "€1 234"). */
function fmtEUR(n) {
    return Math.round(n).toLocaleString('fr-FR') + ' €';
}
// Alias rétro-compat.
var fmt = fmtEUR;

function pct(x) { return (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %'; }

/* ---- Calculateurs prospectifs (versement unique, capitalisation annuelle) ---- */

async function calculPEA(montant, duree, rendement) {
    const C = await loadConstants();
    const capitalBrut = montant * Math.pow(1 + rendement, duree);
    const gains = capitalBrut - montant;

    let ir = 0;
    const ps = gains * C.pfu[C.pea.ps_applicable];
    if (duree < C.pea.duree_exoneration_ir) ir = gains * C.pfu.ir_flat;

    const taxes = ir + ps;
    return { brut: capitalBrut, net: capitalBrut - taxes, gains, ir, ps, totalTaxes: taxes };
}

async function calculAssuranceVie(montant, duree, rendement, situationFamiliale = 'seul') {
    const C = await loadConstants();
    const capitalBrut = montant * Math.pow(1 + rendement, duree);
    const gains = capitalBrut - montant;

    let ir = 0;
    const ps = gains * C.pfu[C.assurance_vie.ps_applicable];

    if (duree < C.assurance_vie.seuil_anciennete_ans) {
        ir = gains * C.pfu.ir_flat;
    } else {
        const r = imposeApres8Ans(gains, situationFamiliale, montant, C);
        ir = r.ir;
    }

    const taxes = ir + ps;
    return { brut: capitalBrut, net: capitalBrut - taxes, gains, ir, ps, totalTaxes: taxes };
}

async function calculCTO(montant, duree, rendement) {
    const C = await loadConstants();
    const capitalBrut = montant * Math.pow(1 + rendement, duree);
    const gains = capitalBrut - montant;

    const ir = gains * C.pfu.ir_flat;
    const ps = gains * C.pfu.ps_standard;
    const taxes = ir + ps;
    return { brut: capitalBrut, net: capitalBrut - taxes, gains, ir, ps, totalTaxes: taxes };
}

/* ---- Helper partagé : IR sur des gains d'assurance-vie retirés après 8 ans ----
 * Abattement (4 600 / 9 200) sur l'assiette IR uniquement.
 * 7,5 % sur la fraction de primes <= 150 000 €, 12,8 % au-delà (prorata).
 * `primesTotales` = total des primes versées sur le(s) contrat(s). */
function imposeApres8Ans(gains, situationFamiliale, primesTotales, C) {
    const av = C.assurance_vie;
    const abattement = situationFamiliale === 'couple' ? av.abattement_annuel_couple : av.abattement_annuel_seul;
    const assietteIR = Math.max(0, gains - abattement);

    let ir;
    if (primesTotales <= av.seuil_primes_taux_reduit) {
        ir = assietteIR * av.taux_apres_8_ans_sous_seuil;
    } else {
        const fSous = av.seuil_primes_taux_reduit / primesTotales;
        ir = assietteIR * fSous * av.taux_apres_8_ans_sous_seuil
           + assietteIR * (1 - fSous) * av.taux_apres_8_ans_au_dela_seuil;
    }
    return { abattement, assietteIR, ir };
}

/* ---- Calculateur diagnostique : rachat sur un contrat d'assurance-vie détenu ----
 * opts : { valeurContrat, primesTotales, rachat, anciennete, situation, versementsAvant2017 }
 * Part de produits contenus dans le rachat : produits = rachat - primes * rachat / valeur. */
async function calculAvRachat(opts) {
    const C = await loadConstants();
    const av = C.assurance_vie;
    const { valeurContrat, primesTotales, rachat, anciennete, situation = 'seul', versementsAvant2017 = false } = opts;

    const ratioPrimes = valeurContrat > 0 ? Math.min(1, primesTotales / valeurContrat) : 0;
    const produits = Math.max(0, rachat - rachat * ratioPrimes);
    const ps = produits * C.pfu[av.ps_applicable];

    let ir = 0, tauxIR = 0, regime = '';

    if (anciennete >= av.seuil_anciennete_ans) {
        const r = imposeApres8Ans(produits, situation, primesTotales, C);
        if (versementsAvant2017 && primesTotales > av.seuil_primes_taux_reduit) {
            // Primes antérieures au 27/09/2017 : PFL 7,5 % sans plafond de 150 000 €.
            ir = r.assietteIR * av.pfl_historique.apres_8_ans;
            regime = 'Après 8 ans — PFL historique 7,5 % (primes avant 27/09/2017), abattement appliqué';
        } else {
            ir = r.ir;
            regime = 'Après 8 ans — abattement ' + fmtEUR(r.abattement) + ', IR 7,5 % / 12,8 % au prorata du seuil de 150 000 €';
        }
        tauxIR = r.assietteIR > 0 ? ir / r.assietteIR : 0;
    } else if (versementsAvant2017) {
        const t = anciennete < 4 ? av.pfl_historique.avant_4_ans : av.pfl_historique.de_4_a_8_ans;
        ir = produits * t; tauxIR = t;
        regime = 'Avant 8 ans — PFL historique ' + pct(t) + ' (primes avant 27/09/2017)';
    } else {
        ir = produits * C.pfu.ir_flat; tauxIR = C.pfu.ir_flat;
        regime = 'Avant 8 ans — PFU : IR 12,8 % + PS 17,2 % (pas d\'abattement)';
    }

    const taxes = ir + ps;
    return { produits, ir, ps, tauxIR, net: rachat - taxes, totalTaxes: taxes, regime };
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = { loadConstants, fmtEUR, pct, calculPEA, calculAssuranceVie, calculCTO, imposeApres8Ans, calculAvRachat };
}
