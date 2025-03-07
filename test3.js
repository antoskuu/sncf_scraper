const axios = require('axios');
const fs = require('fs');

// Configuration: routes to monitor
const routesToMonitor = [
  { origin: 'FRRHE', destination: 'FRPST', date: '2025-03-10' },
  { origin: 'FRPLY', destination: 'FRLPD', date: '2025-03-15' },
  // Ajoutez d'autres routes selon vos besoins
];

// Intervalle entre les vérifications (en millisecondes)
const checkInterval = 30 * 60 * 1000; // 30 minutes

async function fetchRoute(origin, destination, date) {
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
    
    // Create directory structure if it doesn't exist
    const dir = './data';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // Create a filename with the route and date information
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${dir}/sncf-data-${origin}-${destination}-${date}-${timestamp}.json`;
    
    // Write data to JSON file
    fs.writeFileSync(
      filename, 
      JSON.stringify(data, null, 2),
      'utf-8'
    );
    
    console.log(`Data saved to ${filename}`);
    return data;
  } catch (err) {
    console.error(`Error fetching ${origin} → ${destination} on ${date}:`, err.message);
    // Continue with other routes even if one fails
    return null;
  }
}

async function monitorRoutes() {
  console.log(`[${new Date().toISOString()}] Starting monitoring cycle...`);
  
  // Process routes sequentially to avoid overloading the server
  for (const route of routesToMonitor) {
    await fetchRoute(route.origin, route.destination, route.date);
    // Add a small delay between requests to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log(`[${new Date().toISOString()}] Monitoring cycle completed.`);
}

// Function to add a new route to monitor
function addRouteToMonitor(origin, destination, date) {
  routesToMonitor.push({ origin, destination, date });
  console.log(`Added new route to monitor: ${origin} → ${destination} on ${date}`);
  // Save the current monitoring list to a file
  saveMonitoringConfig();
}

// Function to save monitoring configuration
function saveMonitoringConfig() {
  fs.writeFileSync(
    './monitoring-config.json',
    JSON.stringify({ 
      routes: routesToMonitor, 
      lastUpdated: new Date().toISOString() 
    }, null, 2),
    'utf-8'
  );
  console.log('Monitoring configuration saved.');
}

// Function to load monitoring configuration
function loadMonitoringConfig() {
  try {
    if (fs.existsSync('./monitoring-config.json')) {
      const config = JSON.parse(fs.readFileSync('./monitoring-config.json', 'utf-8'));
      if (config.routes && Array.isArray(config.routes)) {
        // Replace the current routes with the loaded ones
        routesToMonitor.length = 0;
        config.routes.forEach(route => routesToMonitor.push(route));
        console.log(`Loaded ${routesToMonitor.length} routes from configuration.`);
      }
    }
  } catch (err) {
    console.error('Error loading monitoring configuration:', err.message);
  }
}

// Start monitoring system
function startMonitoring() {
  // Load existing configuration if available
  loadMonitoringConfig();
  
  // Run immediately
  monitorRoutes();
  
  // Then schedule regular checks
  setInterval(monitorRoutes, checkInterval);
  
  console.log(`Monitoring system started. Will check routes every ${checkInterval/60000} minutes.`);
}

// Check if running as a stand-alone script or with command-line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  // No arguments, start the monitoring system
  startMonitoring();
} else if (args[0] === 'add' && args.length === 4) {
  // Add a new route: node test2.js add ORIGIN DESTINATION DATE
  addRouteToMonitor(args[1], args[2], args[3]);
  startMonitoring();
} else if (args.length === 3) {
  // One-time fetch: node test2.js ORIGIN DESTINATION DATE
  fetchRoute(args[0], args[1], args[2]);
} else {
  console.log('Usage:');
  console.log('  - Start monitoring: node test2.js');
  console.log('  - One-time fetch: node test2.js ORIGIN DESTINATION DATE');
  console.log('  - Add route to monitor: node test2.js add ORIGIN DESTINATION DATE');
}