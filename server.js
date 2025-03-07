require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
// Remove cron as we won't use it anymore
const { fetchTravelData } = require('./scraper');
const { findNewOptions } = require('./utils/dataCompare');
const { sendNotification, sendConfirmationEmail } = require('./utils/emailService');

const app = express();
const PORT = process.env.PORT || 3000;

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

// API endpoint to add a new subscription
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email, origin, destination, date } = req.body;
    
    if (!email || !origin || !destination || !date) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const subscriptions = getSubscriptions();
    
    // Check if subscription already exists
    const exists = subscriptions.some(sub => 
      sub.email === email && 
      sub.origin === origin && 
      sub.destination === destination && 
      sub.date === date
    );
    
    if (exists) {
      return res.status(400).json({ error: 'Subscription already exists' });
    }
    
    // Add new subscription
    subscriptions.push({ email, origin, destination, date });
    saveSubscriptions(subscriptions);
    
    // Initial check for this subscription
    try {
      // Fetch travel data for this subscription
      const { currentData } = await fetchTravelData(origin, destination, date);
      console.log(`Initial check done for ${origin} to ${destination} on ${date}`);
      
      // Send confirmation email to user with current travel options
      await sendConfirmationEmail(email, origin, destination, date, currentData);
      
    } catch (err) {
      console.error('Error during initial check:', err);
      // Send confirmation email without travel options
      await sendConfirmationEmail(email, origin, destination, date);
    }
    
    res.status(201).json({ message: 'Subscription added successfully. A confirmation email has been sent.' });
  } catch (error) {
    console.error('Error in /api/subscribe:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// API endpoint to list subscriptions
app.get('/api/subscriptions', (req, res) => {
  try {
    const subscriptions = getSubscriptions();
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// API endpoint to delete a subscription
app.delete('/api/subscriptions', (req, res) => {
  try {
    const { email, origin, destination, date } = req.body;
    
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
        sub.date === date)
    );
    
    // Check if any subscription was removed
    if (filteredSubscriptions.length === initialLength) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Save the updated subscriptions
    saveSubscriptions(filteredSubscriptions);
    
    res.status(200).json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// Remove the cron job and replace with continuous processing function
async function processSubscriptionsWithDelay() {
  console.log('Starting continuous subscription processing at', new Date().toLocaleString());
  
  while (true) {  // Infinite loop to keep the process running
    const subscriptions = getSubscriptions();
    
    if (subscriptions.length === 0) {
      // If no subscriptions, wait a minute then check again
      console.log('No subscriptions to process. Waiting for 1 minute.');
      await new Promise(resolve => setTimeout(resolve, 60000));
      continue;
    }
    
    for (const sub of subscriptions) {
      try {
        const { email, origin, destination, date } = sub;
        
        // Skip checks for past dates
        if (new Date(date) < new Date()) continue;
        
        console.log(`Checking subscription: ${origin} to ${destination} on ${date} for ${email}`);
        const { currentData, previousData } = await fetchTravelData(origin, destination, date);
        
        // Find new options
        const newOptions = findNewOptions(previousData, currentData);
        
        // If there are new options, notify the user
        if (newOptions && newOptions.length > 0) {
          await sendNotification(email, origin, destination, date, newOptions);
        }
      } catch (error) {
        console.error(`Error checking subscription:`, error);
      }
      
      // Wait for 1 minute before checking the next subscription
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
    
    // After processing all subscriptions, start again immediately
    console.log('Completed processing all subscriptions. Starting again.');
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start the continuous processing
  processSubscriptionsWithDelay().catch(err => {
    console.error('Fatal error in subscription processing:', err);
  });
});
