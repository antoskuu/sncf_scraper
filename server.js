require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { fetchTravelData } = require('./scraper');
const { findNewOptions } = require('./utils/dataCompare');
const { sendNotification, sendConfirmationEmail } = require('./utils/emailService');
const stations = require('./data/stations.json');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to format current date and time for logs
function getTimestamp() {
  return new Date().toLocaleString();
}

// Log helper
function logWithTimestamp(message) {
  console.log(`[${getTimestamp()}] ${message}`);
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Path to subscriptions file
const subscriptionsPath = path.join(__dirname, 'subscriptions.json');

// Initialize subscriptions file if it doesn't exist
if (!fs.existsSync(subscriptionsPath)) {
  fs.writeFileSync(subscriptionsPath, JSON.stringify([], null, 2));
}

// Helper to read subscriptions
function getSubscriptions() {
  return JSON.parse(fs.readFileSync(subscriptionsPath, 'utf-8'));
}

// Helper to write subscriptions
function saveSubscriptions(subscriptions) {
  fs.writeFileSync(subscriptionsPath, JSON.stringify(subscriptions, null, 2));
}

// API endpoint to get all stations
app.get('/api/stations', (req, res) => {
  try {
    res.json(stations);
  } catch (error) {
    logWithTimestamp(`Error fetching stations: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// API endpoint to add a new subscription
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email, origin, destination, date, preferredTime } = req.body;
    
    if (!email || !origin || !destination || !date) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const subscriptions = getSubscriptions();
    
    // Check if subscription already exists
    const exists = subscriptions.some(sub => 
      sub.email === email && 
      sub.origin === origin && 
      sub.destination === destination && 
      sub.date === date &&
      sub.preferredTime === preferredTime
    );
    
    if (exists) {
      return res.status(400).json({ error: 'Subscription already exists' });
    }
    
    // Add new subscription with optional preferred time
    const newSubscription = { 
      email, 
      origin, 
      destination, 
      date
    };
    
    // Add preferredTime only if it exists
    if (preferredTime) {
      newSubscription.preferredTime = preferredTime;
    }
    
    subscriptions.push(newSubscription);
    saveSubscriptions(subscriptions);
    
    // Initial check for this subscription
    try {
      // Fetch travel data for this subscription, passing the preferred time
      const { currentData } = await fetchTravelData(origin, destination, date, preferredTime);
      logWithTimestamp(`Initial check done for ${origin} to ${destination} on ${date}${preferredTime ? ' at ' + preferredTime : ''}`);
      
      // Send confirmation email to user with current travel options
      await sendConfirmationEmail(email, origin, destination, date, currentData, preferredTime);
      
    } catch (err) {
      logWithTimestamp(`Error during initial check: ${err.message}`);
      // Send confirmation email without travel options
      await sendConfirmationEmail(email, origin, destination, date, null, preferredTime);
    }
    
    res.status(201).json({ message: 'Subscription added successfully. A confirmation email has been sent.' });
  } catch (error) {
    logWithTimestamp(`Error in /api/subscribe: ${error.message}`);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// API endpoint to list subscriptions
app.get('/api/subscriptions', (req, res) => {
  try {
    const subscriptions = getSubscriptions();
    res.json(subscriptions);
  } catch (error) {
    logWithTimestamp(`Error fetching subscriptions: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// API endpoint to delete a subscription
app.delete('/api/subscriptions', (req, res) => {
  try {
    const { email, origin, destination, date, preferredTime } = req.body;
    
    if (!email || !origin || !destination || !date) {
      return res.status(400).json({ error: 'All fields are required to identify the subscription' });
    }
    
    const subscriptions = getSubscriptions();
    
    // Find the subscription to delete
    const initialLength = subscriptions.length;
    const filteredSubscriptions = subscriptions.filter(sub => 
      !(sub.email === email && 
        sub.origin === origin && 
        sub.destination === destination && 
        sub.date === date &&
        sub.preferredTime === preferredTime)
    );
    
    // Check if any subscription was removed
    if (filteredSubscriptions.length === initialLength) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Save the updated subscriptions
    saveSubscriptions(filteredSubscriptions);
    
    res.status(200).json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    logWithTimestamp(`Error deleting subscription: ${error.message}`);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// Continuous processing function
async function processSubscriptionsWithDelay() {
  logWithTimestamp('Starting continuous subscription processing');
  
  while (true) {  // Infinite loop to keep the process running
    const subscriptions = getSubscriptions();
    
    if (subscriptions.length === 0) {
      // If no subscriptions, wait a minute then check again
      logWithTimestamp('No subscriptions to process. Waiting for 1 minute.');
      await new Promise(resolve => setTimeout(resolve, 60000));
      continue;
    }
    
    for (const sub of subscriptions) {
      try {
        const { email, origin, destination, date, preferredTime } = sub;
        
        // Skip checks for past dates
        if (new Date(date) < new Date()) continue;
        
        logWithTimestamp(`Checking subscription: ${origin} to ${destination} on ${date}${preferredTime ? ' at ' + preferredTime : ''} for ${email}`);
        const { currentData, previousData } = await fetchTravelData(origin, destination, date, preferredTime);
        
        // Find new options
        const newOptions = findNewOptions(previousData, currentData, preferredTime);
        
        // If there are new options, notify the user
        if (newOptions && newOptions.length > 0) {
          logWithTimestamp(`Found ${newOptions.length} new options for ${email}. Sending notification.`);
          await sendNotification(email, origin, destination, date, newOptions, preferredTime);
        }
      } catch (error) {
        logWithTimestamp(`Error checking subscription: ${error.message}`);
      }
      
      // Wait for 1 minute before checking the next subscription
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    
    // After processing all subscriptions, start again immediately
    logWithTimestamp('Completed processing all subscriptions. Starting again.');
  }
}

// Start the server
app.listen(PORT, () => {
  logWithTimestamp(`Server running on port ${PORT}`);
  
  // Start the continuous processing
  processSubscriptionsWithDelay().catch(err => {
    logWithTimestamp(`Fatal error in subscription processing: ${err.message}`);
  });
});
