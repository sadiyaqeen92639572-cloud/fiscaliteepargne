const { calculPEA, calculAssuranceVie, calculCTO } = require('./assets/calculators.js');

async function runTests() {
    console.log("--- TEST: 100 000€ sur 10 ans à 5% ---");
    const montant = 100000;
    const duree = 10;
    const rendement = 0.05;
    
    const resPEA = await calculPEA(montant, duree, rendement);
    console.log("PEA:", resPEA);
    
    const resAV = await calculAssuranceVie(montant, duree, rendement);
    console.log("Assurance Vie:", resAV);
    
    const resCTO = await calculCTO(montant, duree, rendement);
    console.log("CTO:", resCTO);
}

runTests();
