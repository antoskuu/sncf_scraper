const axios = require('axios');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Avez-vous payé la licence à Antonin Guy? @antosucre sur paypal 5€ svp (y/n) ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
        const url = process.argv[2] || 'https://www.maxjeune-tgvinoui.sncf/api/public/refdata/search-freeplaces-proposals?destination=FRPST&origin=FRRHE&departureDateTime=2025-03-10T01:00:00.000Z';
        await run(url);
    } else {
        console.log('Vous devez payer la licence pour utiliser ce service.');
    }
    rl.close();
});

async function run(url) {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                'Referer': 'https://www.google.com/',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cookie': 'datadome=Tflu~l0KxDJvZSEHAuufKtTDiyFG0xWMqAEPNUU1Xf1garj7lyu8XZ4_vw0Y_qFMqx4zXzhPRLkXUDfdyjDrDN1iXCzA0gIo8iVakpiFpljOm~iBtWeCrqE~doeV83Uw'
            }
        });
        
        // Write data to JSON file
        fs.writeFileSync(
            'sncf-data.json', 
            JSON.stringify(data, null, 2),
            'utf-8'
        );
        
        console.log('Data saved to sncf-data.json');
        return data;
    } catch (err) {
        console.error('Error:', err.message);
        throw err;
    }
}