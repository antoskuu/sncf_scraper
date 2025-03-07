const axios = require('axios');
const fs = require('fs');

async function run(origin, destination, date) {
    try {
        // Format the URL with the provided parameters
        const url = `https://www.maxjeune-tgvinoui.sncf/api/public/refdata/search-freeplaces-proposals?destination=${destination}&origin=${origin}&departureDateTime=${date}T01:00:00.000Z`;
        
        console.log(`Fetching data for route ${origin} → ${destination} on ${date}`);
        
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
        
        // Create a filename with the route and date information
        const filename = `sncf-data-${origin}-${destination}-${date}.json`;
        
        // Write data to JSON file
        fs.writeFileSync(
            filename, 
            JSON.stringify(data, null, 2),
            'utf-8'
        );
        
        console.log(`Data saved to ${filename}`);
        return data;
    } catch (err) {
        console.error('Error:', err.message);
        throw err;
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const origin = args[0] || 'FRRHE';         // Default: Rheims
const destination = args[1] || 'FRPST';    // Default: Paris
const date = args[2] || '2025-03-10';      // Default: March 10, 2025

run(origin, destination, date);