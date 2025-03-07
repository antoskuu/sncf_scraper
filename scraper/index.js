const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function fetchTravelData(origin, destination, date, preferredTime = null) {
  try {
    // Format the URL with the provided parameters
    const url = `https://www.maxjeune-tgvinoui.sncf/api/public/refdata/search-freeplaces-proposals?destination=${destination}&origin=${origin}&departureDateTime=${date}T01:00:00.000Z`;
    
    console.log(`Fetching data for route ${origin} → ${destination} on ${date}${preferredTime ? ' at ' + preferredTime : ''}`);
    
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
    
    // If a preferred time is provided, we'll add that to the filename
    const timeComponent = preferredTime ? `-${preferredTime.replace(':', '')}` : '';
    
    // Create a filename with the route, date, and time information
    const filename = path.join(dataDir, `sncf-data-${origin}-${destination}-${date}${timeComponent}.json`);
    
    // Check for previous data
    let previousData = null;
    if (fs.existsSync(filename)) {
      previousData = JSON.parse(fs.readFileSync(filename, 'utf-8'));
    }
    
    // Write data to JSON file
    fs.writeFileSync(
      filename, 
      JSON.stringify(data, null, 2),
      'utf-8'
    );
    
    console.log(`Data saved to ${filename}`);
    return { currentData: data, previousData };
  } catch (err) {
    console.error('Error:', err.message);
    throw err;
  }
}

module.exports = { fetchTravelData };
