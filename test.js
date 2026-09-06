/* Tests de régression du moteur de calcul. Zéro dépendance : `node test.js`. */
const assert = require('assert');
const {
  loadConstants, calculPEA, calculAssuranceVie, calculCTO, imposeApres8Ans, calculAvRachat,
} = require('./assets/calculators.js');

const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;
let ok = 0;
function t(name, fn) { try { fn(); console.log('  ✓ ' + name); ok++; } catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; } }

(async () => {
  const C = await loadConstants();

  // Référence : 100 000 € / 10 ans / 5 % → brut 162 889,46 ; gain 62 889,46
  const brut = 100000 * Math.pow(1.05, 10);
  const gain = brut - 100000;

  await t('PEA >= 5 ans : IR nul, PS 18,6 %', async () => {
    const r = await calculPEA(100000, 10, 0.05);
    assert.strictEqual(r.ir, 0);
    assert.ok(near(r.ps, gain * 0.186));
    assert.ok(near(r.net, brut - gain * 0.186));
  });

  await t('PEA < 5 ans : IR 12,8 % + PS 18,6 % (PFU 31,4 %)', async () => {
    const b = 100000 * Math.pow(1.05, 3), g = b - 100000;
    const r = await calculPEA(100000, 3, 0.05);
    assert.ok(near(r.ir, g * 0.128));
    assert.ok(near(r.ir + r.ps, g * 0.314));
  });

  await t('CTO : PFU 31,4 % de la plus-value', async () => {
    const r = await calculCTO(100000, 10, 0.05);
    assert.ok(near(r.totalTaxes, gain * 0.314));
  });

  await t('AV < 8 ans : IR 12,8 % plein + PS 17,2 %', async () => {
    const r = await calculAssuranceVie(100000, 5, 0.05);
    const b = 100000 * Math.pow(1.05, 5), g = b - 100000;
    assert.ok(near(r.ir, g * 0.128));
    assert.ok(near(r.ps, g * 0.172));
  });

  await t('AV >= 8 ans couple : abattement 9 200 €, IR 7,5 % (primes <= 150k)', async () => {
    const r = await calculAssuranceVie(100000, 10, 0.05, 'couple');
    const assiette = Math.max(0, gain - 9200);
    assert.ok(near(r.ir, assiette * 0.075));
    assert.ok(near(r.ps, gain * 0.172));
  });

  await t('imposeApres8Ans : prorata du seuil de 150 000 € de primes', () => {
    const r = imposeApres8Ans(20000, 'seul', 300000, C); // 50 % sous seuil, 50 % au-delà
    const assiette = 20000 - 4600;
    assert.ok(near(r.ir, assiette * 0.5 * 0.075 + assiette * 0.5 * 0.128));
  });

  await t('calcul rachat diagnostique : part de produits au prorata', async () => {
    const r = await calculAvRachat({ valeurContrat: 120000, primesTotales: 100000, rachat: 30000, anciennete: 9, situation: 'seul' });
    assert.ok(near(r.produits, 5000)); // 30000 - 100000*30000/120000
    assert.ok(near(r.ps, 5000 * 0.172));
  });

  await t('rachat < 8 ans avec primes avant 2017 : PFL historique 15 %', async () => {
    const r = await calculAvRachat({ valeurContrat: 120000, primesTotales: 100000, rachat: 30000, anciennete: 6, situation: 'seul', versementsAvant2017: true });
    assert.ok(near(r.tauxIR, 0.15));
  });

  console.log(`\n${ok} tests OK.`);
})();
