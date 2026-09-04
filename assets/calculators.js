let CONSTANTS = null;

async function loadConstants() {
    if (CONSTANTS) return CONSTANTS;
    // On the browser, use fetch
    if (typeof window !== 'undefined') {
        const res = await fetch('/assets/constants.json');
        CONSTANTS = await res.json();
    } else {
        // In Node for testing
        const fs = require('fs');
        const path = require('path');
        CONSTANTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'constants.json'), 'utf-8'));
    }
    return CONSTANTS;
}

async function calculPEA(montant, duree, rendement) {
    const C = await loadConstants();
    const capitalBrut = montant * Math.pow(1 + rendement, duree);
    const gains = capitalBrut - montant;
    
    let ir = 0;
    let ps = gains * C.pfu[C.pea.ps_applicable];
    
    if (duree < C.pea.duree_exoneration_ir) {
        ir = gains * C.pfu.ir_flat;
    }
    
    const taxes = ir + ps;
    const net = capitalBrut - taxes;
    
    return {
        brut: capitalBrut,
        net: net,
        gains: gains,
        ir: ir,
        ps: ps,
        totalTaxes: taxes
    };
}

async function calculAssuranceVie(montant, duree, rendement, situationFamiliale = 'seul') {
    const C = await loadConstants();
    const capitalBrut = montant * Math.pow(1 + rendement, duree);
    const gains = capitalBrut - montant;
    
    let ir = 0;
    let ps = gains * C.pfu[C.assurance_vie.ps_applicable];
    
    if (duree < C.assurance_vie.seuil_anciennete_ans) {
        ir = gains * C.pfu.ir_flat;
    } else {
        const abattement = situationFamiliale === 'couple' ? C.assurance_vie.abattement_annuel_couple : C.assurance_vie.abattement_annuel_seul;
        const assietteIR = Math.max(0, gains - abattement);
        
        if (montant <= C.assurance_vie.seuil_primes_taux_reduit) {
            ir = assietteIR * C.assurance_vie.taux_apres_8_ans_sous_seuil;
        } else {
            const fractionSousSeuil = C.assurance_vie.seuil_primes_taux_reduit / montant;
            const fractionAuDela = 1 - fractionSousSeuil;
            ir = (assietteIR * fractionSousSeuil * C.assurance_vie.taux_apres_8_ans_sous_seuil) + 
                 (assietteIR * fractionAuDela * C.assurance_vie.taux_apres_8_ans_au_dela_seuil);
        }
    }
    
    const taxes = ir + ps;
    const net = capitalBrut - taxes;
    
    return {
        brut: capitalBrut,
        net: net,
        gains: gains,
        ir: ir,
        ps: ps,
        totalTaxes: taxes
    };
}

async function calculCTO(montant, duree, rendement) {
    const C = await loadConstants();
    const capitalBrut = montant * Math.pow(1 + rendement, duree);
    const gains = capitalBrut - montant;
    
    const ir = gains * C.pfu.ir_flat;
    const ps = gains * C.pfu.ps_standard;
    
    const taxes = ir + ps;
    const net = capitalBrut - taxes;
    
    return {
        brut: capitalBrut,
        net: net,
        gains: gains,
        ir: ir,
        ps: ps,
        totalTaxes: taxes
    };
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
        loadConstants,
        calculPEA,
        calculAssuranceVie,
        calculCTO
    };
}
