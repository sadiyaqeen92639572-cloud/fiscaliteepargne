/* Markup + script de chaque calculateur, injectés par build.js.
 * fmtEUR / pct / calcul* proviennent de /assets/calculators.js (chargé en defer).
 * Constantes disponibles synchrones via window.__CONSTS__ (inline dans <head>). */

const markup = {};
const script = {};

/* ---------- compare3 : hub 3 enveloppes (homepage) ---------- */
markup.compare3 = `<div class="card">
    <label for="montant">Montant du versement initial (€)</label>
    <input type="number" id="montant" value="100000" min="0">
    <label for="duree">Durée d'investissement (années)</label>
    <input type="number" id="duree" value="10" min="1">
    <label for="rendement">Rendement annuel estimé (%)</label>
    <input type="number" id="rendement" value="5" min="0" step="0.1">
    <label for="situation">Situation familiale (abattement assurance-vie après 8 ans)</label>
    <select id="situation"><option value="seul">Personne seule</option><option value="couple">Couple marié/pacsé (imposition commune)</option></select>
    <button class="calc-btn" onclick="runCompare3()">Comparer les 3 enveloppes</button>
    <div class="result" id="comparison-result"><div class="result-grid three-cols" id="comparison-grid"></div></div>
  </div>
  <div class="cross-link">📈 Mieux comprendre le calcul ? <a href="/interet-compose/">Calculez l'effet des intérêts composés →</a></div>`;
script.compare3 = `async function runCompare3(){
  const m=parseFloat(montant.value)||0,d=parseFloat(duree.value)||0,r=(parseFloat(rendement.value)||0)/100,s=situation.value;
  const [pea,av,cto]=await Promise.all([calculPEA(m,d,r),calculAssuranceVie(m,d,r,s),calculCTO(m,d,r)]);
  const card=(t,o,href,lbl,col)=>\`<div class="stat" style="border-top:4px solid \${col}"><h3 style="margin-top:0">\${t}</h3><div class="amount" style="font-size:1.5rem;font-weight:800;color:var(--brand-dark)">\${fmtEUR(o.net)}</div><div class="lbl">Net après impôts</div><hr style="margin:10px 0;border:none;border-top:1px solid var(--border)"><div>Gain brut : <strong>\${fmtEUR(o.gains)}</strong></div><div>Impôt sur le revenu : <strong>\${fmtEUR(o.ir)}</strong></div><div>Prélèvements sociaux : <strong>\${fmtEUR(o.ps)}</strong></div><a href="\${href}" style="display:block;margin-top:10px;font-size:.9rem;color:var(--brand);text-decoration:none;font-weight:bold">\${lbl} →</a></div>\`;
  document.getElementById('comparison-grid').innerHTML=card('PEA',pea,'/pea/','Voir le détail PEA','var(--brand)')+card('Assurance-Vie',av,'/assurance-vie-fiscalite/','Voir la fiscalité assurance-vie','var(--gold)')+card('CTO',cto,'/compte-titres-fiscalite/','Voir le détail CTO','var(--muted)');
  document.getElementById('comparison-result').classList.add('show');
}`;

/* ---------- pea ---------- */
markup.pea = `<div class="card">
    <h2>Calculateur de rendement net PEA</h2>
    <label for="montant">Montant investi (€)</label>
    <input type="number" id="montant" value="150000" min="0">
    <label for="duree">Durée d'investissement (années)</label>
    <input type="number" id="duree" value="15" min="1">
    <label for="rendement">Rendement annuel estimé (%)</label>
    <input type="number" id="rendement" value="5" min="0" step="0.1">
    <button class="calc-btn" onclick="runPEA()">Calculer le gain net</button>
    <div class="result" id="pea-result">
      <div class="result-hero"><div class="amount" id="pea-net-val"></div><div class="amount-label">Capital final net (après prélèvements sociaux)</div></div>
      <div class="result-grid">
        <div class="stat"><div class="val" id="pea-brut-val"></div><div class="lbl">Capital brut</div></div>
        <div class="stat"><div class="val" id="pea-gains-val"></div><div class="lbl">Gains générés</div></div>
        <div class="stat"><div class="val" id="pea-ps-val"></div><div class="lbl">Prélèvements sociaux</div></div>
        <div class="stat"><div class="val" id="pea-ir-val"></div><div class="lbl">Impôt sur le revenu</div></div>
      </div>
      <div class="result-note" id="pea-note"></div>
    </div>
  </div>`;
script.pea = `async function runPEA(){
  const m=parseFloat(montant.value)||0,d=parseFloat(duree.value)||0,r=(parseFloat(rendement.value)||0)/100;
  const o=await calculPEA(m,d,r);
  document.getElementById('pea-net-val').textContent=fmtEUR(o.net);
  document.getElementById('pea-brut-val').textContent=fmtEUR(o.brut);
  document.getElementById('pea-gains-val').textContent=fmtEUR(o.gains);
  document.getElementById('pea-ps-val').textContent=fmtEUR(o.ps);
  document.getElementById('pea-ir-val').textContent=fmtEUR(o.ir);
  document.getElementById('pea-note').textContent = o.ir>0
    ? "Durée inférieure à 5 ans : retrait = clôture, les gains sont soumis au PFU (IR 12,8 % + PS 18,6 %)."
    : "Exonération d'impôt sur le revenu acquise (durée ≥ 5 ans). Seuls les prélèvements sociaux 18,6 % restent dus.";
  document.getElementById('pea-result').classList.add('show');
}
window.addEventListener('DOMContentLoaded',function(){
  var C=window.__CONSTS__;var p=document.getElementById('text-plafond');var pme=document.getElementById('text-plafond-pme');
  if(p)p.innerHTML='<strong>PEA classique :</strong> '+fmtEUR(C.pea.plafond_versements);
  if(pme)pme.innerHTML='<strong>PEA + PEA-PME (cumulé) :</strong> '+fmtEUR(C.pea.plafond_pea_pme);
});`;

/* ---------- compareAV : PEA vs assurance-vie (prospectif) ---------- */
markup.compareAV = `<div class="card">
    <h2>Comparateur net à net</h2>
    <label for="montant">Montant du versement initial (€)</label>
    <input type="number" id="montant" value="100000" min="0">
    <label for="duree">Durée d'investissement (années)</label>
    <input type="number" id="duree" value="10" min="1">
    <label for="rendement">Rendement annuel estimé (%)</label>
    <input type="number" id="rendement" value="5" min="0" step="0.1">
    <label for="situation">Situation familiale (abattement assurance-vie)</label>
    <select id="situation"><option value="seul">Personne seule</option><option value="couple">Couple marié/pacsé</option></select>
    <button class="calc-btn" onclick="runCompareAV()">Comparer PEA et assurance-vie</button>
    <div class="result" id="comparison-result"><div class="result-grid">
      <div class="stat" style="border-top:4px solid var(--brand)"><h3 style="margin-top:0">PEA</h3><div class="amount" id="pea-net-val" style="font-size:1.5rem;font-weight:800;color:var(--brand-dark)"></div><div class="lbl">Net après impôts</div><hr style="margin:10px 0;border:none;border-top:1px solid var(--border)"><div style="font-size:.9rem">IR : <strong id="pea-ir-val"></strong></div><div style="font-size:.9rem">PS : <strong id="pea-ps-val"></strong></div></div>
      <div class="stat" style="border-top:4px solid var(--gold)"><h3 style="margin-top:0">Assurance-Vie</h3><div class="amount" id="av-net-val" style="font-size:1.5rem;font-weight:800;color:var(--brand-dark)"></div><div class="lbl">Net après impôts</div><hr style="margin:10px 0;border:none;border-top:1px solid var(--border)"><div style="font-size:.9rem">IR : <strong id="av-ir-val"></strong></div><div style="font-size:.9rem">PS : <strong id="av-ps-val"></strong></div></div>
    </div></div>
  </div>`;
script.compareAV = `async function runCompareAV(){
  const m=parseFloat(montant.value)||0,d=parseFloat(duree.value)||0,r=(parseFloat(rendement.value)||0)/100,s=situation.value;
  const [pea,av]=await Promise.all([calculPEA(m,d,r),calculAssuranceVie(m,d,r,s)]);
  document.getElementById('pea-net-val').textContent=fmtEUR(pea.net);
  document.getElementById('pea-ir-val').textContent=fmtEUR(pea.ir);
  document.getElementById('pea-ps-val').textContent=fmtEUR(pea.ps);
  document.getElementById('av-net-val').textContent=fmtEUR(av.net);
  document.getElementById('av-ir-val').textContent=fmtEUR(av.ir);
  document.getElementById('av-ps-val').textContent=fmtEUR(av.ps);
  document.getElementById('comparison-result').classList.add('show');
}
window.addEventListener('DOMContentLoaded',function(){
  var C=window.__CONSTS__;var a=document.getElementById('text-abattement-seul');var b=document.getElementById('text-abattement-couple');
  if(a)a.innerHTML='<strong>'+fmtEUR(C.assurance_vie.abattement_annuel_seul)+'</strong> pour une personne seule';
  if(b)b.innerHTML='<strong>'+fmtEUR(C.assurance_vie.abattement_annuel_couple)+'</strong> pour un couple marié ou pacsé';
});`;

/* ---------- cto ---------- */
markup.cto = `<div class="card">
    <h2>Calculateur de rendement net CTO</h2>
    <label for="montant">Montant investi (€)</label>
    <input type="number" id="montant" value="10000" min="0">
    <label for="duree">Durée d'investissement (années)</label>
    <input type="number" id="duree" value="10" min="1">
    <label for="rendement">Rendement annuel estimé (%)</label>
    <input type="number" id="rendement" value="7" min="0" step="0.1">
    <button class="calc-btn" onclick="runCTO()">Calculer le gain net au PFU</button>
    <div class="result" id="cto-result">
      <div class="result-hero"><div class="amount" id="cto-net-val"></div><div class="amount-label">Capital final net (après impôt et prélèvements sociaux)</div></div>
      <div class="result-grid">
        <div class="stat"><div class="val" id="cto-brut-val"></div><div class="lbl">Capital brut</div></div>
        <div class="stat"><div class="val" id="cto-gains-val"></div><div class="lbl">Gains générés</div></div>
        <div class="stat"><div class="val" id="cto-ps-val"></div><div class="lbl">Prélèvements sociaux</div></div>
        <div class="stat"><div class="val" id="cto-ir-val"></div><div class="lbl">Impôt sur le revenu</div></div>
      </div>
      <div class="result-note">Imposition modélisée : <strong id="cto-pfu-rate"></strong> (PFU global sur les plus-values).</div>
    </div>
  </div>`;
script.cto = `async function runCTO(){
  const m=parseFloat(montant.value)||0,d=parseFloat(duree.value)||0,r=(parseFloat(rendement.value)||0)/100;
  const o=await calculCTO(m,d,r);
  document.getElementById('cto-net-val').textContent=fmtEUR(o.net);
  document.getElementById('cto-brut-val').textContent=fmtEUR(o.brut);
  document.getElementById('cto-gains-val').textContent=fmtEUR(o.gains);
  document.getElementById('cto-ps-val').textContent=fmtEUR(o.ps);
  document.getElementById('cto-ir-val').textContent=fmtEUR(o.ir);
  document.getElementById('cto-result').classList.add('show');
}
window.addEventListener('DOMContentLoaded',function(){
  var C=window.__CONSTS__;
  var set=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  set('pfu-ir-rate',pct(C.pfu.ir_flat));set('pfu-ps-rate',pct(C.pfu.ps_standard));
  set('pfu-total-rate',pct(C.pfu.global_pea_cto));set('cto-pfu-rate',pct(C.pfu.global_pea_cto));
});`;

/* ---------- compound : intérêts composés (capitalisation mensuelle) ---------- */
markup.compound = `<div class="card">
    <h2>Simulateur brut</h2>
    <label for="montant">Capital initial (€)</label>
    <input type="number" id="montant" value="10000" min="0">
    <label for="versement">Versement mensuel régulier (€)</label>
    <input type="number" id="versement" value="200" min="0">
    <label for="duree">Durée du placement (années)</label>
    <input type="number" id="duree" value="20" min="1">
    <label for="rendement">Rendement annuel estimé (%)</label>
    <input type="number" id="rendement" value="5" min="0" step="0.1">
    <button class="calc-btn" onclick="runCompound()">Calculer le capital final</button>
    <div class="result" id="compound-result">
      <div class="result-hero"><div class="amount" id="cmp-total-val"></div><div class="amount-label">Capital final estimé (brut, avant impôt et frais)</div></div>
      <div class="result-grid">
        <div class="stat"><div class="val" id="cmp-versements-val"></div><div class="lbl">Total des versements</div></div>
        <div class="stat"><div class="val" id="cmp-interets-val"></div><div class="lbl">Intérêts générés</div></div>
      </div>
    </div>
  </div>`;
script.compound = `function runCompound(){
  const c0=parseFloat(montant.value)||0,v=parseFloat(versement.value)||0,d=parseFloat(duree.value)||0,r=(parseFloat(rendement.value)||0)/100;
  const totalVers=c0+v*12*d;
  const tm=Math.pow(1+r,1/12)-1, n=d*12;
  const vc=c0*Math.pow(1+tm,n);
  const vv=(v>0&&tm>0)? v*((Math.pow(1+tm,n)-1)/tm) : v*n;
  const brut=vc+vv;
  document.getElementById('cmp-total-val').textContent=fmtEUR(brut);
  document.getElementById('cmp-versements-val').textContent=fmtEUR(totalVers);
  document.getElementById('cmp-interets-val').textContent=fmtEUR(brut-totalVers);
  document.getElementById('compound-result').classList.add('show');
}`;

/* ---------- avRachat : diagnostique (contrat détenu) ---------- */
markup.avRachat = `<div class="card">
    <h2>Calculateur d'imposition d'un rachat</h2>
    <p class="rate-note">Simule l'imposition d'un rachat sur un contrat d'assurance-vie que vous détenez déjà.</p>
    <label for="valeur">Valeur actuelle du contrat (€)</label>
    <input type="number" id="valeur" value="120000" min="0">
    <label for="primes">Total des primes versées depuis l'ouverture (€)</label>
    <input type="number" id="primes" value="100000" min="0">
    <label for="rachat">Montant du rachat envisagé (€)</label>
    <input type="number" id="rachat" value="30000" min="0">
    <label for="anciennete">Ancienneté du contrat (années)</label>
    <input type="number" id="anciennete" value="9" min="0">
    <label for="situation">Situation familiale</label>
    <select id="situation"><option value="seul">Personne seule</option><option value="couple">Couple marié/pacsé</option></select>
    <label for="avant2017">Date des versements</label>
    <select id="avant2017"><option value="0">Tous après le 27/09/2017</option><option value="1">Primes versées avant le 27/09/2017</option></select>
    <button class="calc-btn" onclick="runAvRachat()">Calculer l'imposition du rachat</button>
    <div class="result" id="av-result">
      <div class="result-hero"><div class="amount" id="av-net-val"></div><div class="amount-label">Montant net perçu après impôt et prélèvements sociaux</div></div>
      <div class="result-grid">
        <div class="stat"><div class="val" id="av-produits-val"></div><div class="lbl">Produits (gains) dans le rachat</div></div>
        <div class="stat"><div class="val" id="av-ir-val"></div><div class="lbl">Impôt sur le revenu</div></div>
        <div class="stat"><div class="val" id="av-ps-val"></div><div class="lbl">Prélèvements sociaux 17,2 %</div></div>
        <div class="stat"><div class="val" id="av-taux-val"></div><div class="lbl">Taux d'IR retenu</div></div>
      </div>
      <div class="result-note" id="av-note"></div>
    </div>
  </div>`;
script.avRachat = `async function runAvRachat(){
  const o=await calculAvRachat({
    valeurContrat:parseFloat(valeur.value)||0,
    primesTotales:parseFloat(primes.value)||0,
    rachat:parseFloat(rachat.value)||0,
    anciennete:parseFloat(anciennete.value)||0,
    situation:situation.value,
    versementsAvant2017:avant2017.value==='1'
  });
  document.getElementById('av-net-val').textContent=fmtEUR(o.net);
  document.getElementById('av-produits-val').textContent=fmtEUR(o.produits);
  document.getElementById('av-ir-val').textContent=fmtEUR(o.ir);
  document.getElementById('av-ps-val').textContent=fmtEUR(o.ps);
  document.getElementById('av-taux-val').textContent=pct(o.tauxIR);
  document.getElementById('av-note').textContent=o.regime;
  document.getElementById('av-result').classList.add('show');
}`;

/* ---------- av8ans : abattement isolé après 8 ans ---------- */
markup.av8ans = `<div class="card">
    <h2>Calculateur de l'abattement après 8 ans</h2>
    <label for="gains">Gains (produits) contenus dans le rachat (€)</label>
    <input type="number" id="gains" value="10000" min="0">
    <label for="situation">Situation familiale</label>
    <select id="situation"><option value="seul">Personne seule</option><option value="couple">Couple marié/pacsé</option></select>
    <label for="primes">Total des primes versées sur le(s) contrat(s) (€)</label>
    <input type="number" id="primes" value="120000" min="0">
    <button class="calc-btn" onclick="runAv8ans()">Calculer l'impôt après abattement</button>
    <div class="result" id="a8-result">
      <div class="result-hero"><div class="amount" id="a8-net-val"></div><div class="amount-label">Gains nets après IR et prélèvements sociaux</div></div>
      <div class="result-grid">
        <div class="stat"><div class="val" id="a8-abat-val"></div><div class="lbl">Abattement appliqué</div></div>
        <div class="stat"><div class="val" id="a8-assiette-val"></div><div class="lbl">Assiette imposable à l'IR</div></div>
        <div class="stat"><div class="val" id="a8-ir-val"></div><div class="lbl">Impôt sur le revenu (7,5 % / 12,8 %)</div></div>
        <div class="stat"><div class="val" id="a8-ps-val"></div><div class="lbl">Prélèvements sociaux 17,2 %</div></div>
      </div>
    </div>
  </div>`;
script.av8ans = `function runAv8ans(){
  var C=window.__CONSTS__;
  var g=parseFloat(gains.value)||0, s=situation.value, p=parseFloat(primes.value)||0;
  var r=imposeApres8Ans(g,s,p,C);
  var ps=g*C.pfu.ps_assurance_vie;
  document.getElementById('a8-abat-val').textContent=fmtEUR(r.abattement);
  document.getElementById('a8-assiette-val').textContent=fmtEUR(r.assietteIR);
  document.getElementById('a8-ir-val').textContent=fmtEUR(r.ir);
  document.getElementById('a8-ps-val').textContent=fmtEUR(ps);
  document.getElementById('a8-net-val').textContent=fmtEUR(g-r.ir-ps);
  document.getElementById('a8-result').classList.add('show');
}`;

module.exports = { markup, script };
