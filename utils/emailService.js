const nodemailer = require('nodemailer');
require('dotenv').config();

// Verify required environment variables are available
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('Warning: EMAIL_USER and EMAIL_PASS environment variables must be set for email notifications');
}

// Configure email service using environment variables
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send notification email when new travel options are found
 * @param {String} email User's email address
 * @param {String} origin Origin station code
 * @param {String} destination Destination station code
 * @param {String} date Travel date
 * @param {Array} newOptions New travel options
 * @param {String} preferredTime Preferred departure time (optional)
 */
async function sendNotification(email, origin, destination, date, newOptions, preferredTime = null) {
  try {
    // Get station names (if available)
    let originName = origin;
    let destinationName = destination;
    
    try {
      // Load stations to get proper names
      const stations = require('../data/stations.json');
      const originStation = stations.find(s => s.code === origin);
      const destStation = stations.find(s => s.code === destination);
      
      if (originStation) originName = originStation.name;
      if (destStation) destinationName = destStation.name;
    } catch (err) {
      console.log('Could not load station names:', err.message);
    }
    
    const timeInfo = preferredTime ? ` à ${preferredTime} (±1 heure)` : '';
    const formattedDate = formatDate(date);
    
    // Email subject
    const subject = `Nouvelles options de voyage pour ${originName} → ${destinationName} le ${formattedDate}${timeInfo}`;
    
    // Create the email body with better formatting
    let body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0078d7; border-bottom: 1px solid #eee; padding-bottom: 10px;">Nouvelles options de voyage disponibles!</h2>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Trajet:</strong> ${originName} → ${destinationName}</p>
        <p><strong>Date:</strong> ${formattedDate}${timeInfo}</p>
      </div>
      
      <h3 style="color: #333; margin-top: 20px;">Nouvelles options:</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <tr style="background-color: #0078d7; color: white;">
          <th style="text-align: left; padding: 8px;">Départ</th>
          <th style="text-align: left; padding: 8px;">Arrivée</th>
          <th style="text-align: left; padding: 8px;">Train</th>
          <th style="text-align: center; padding: 8px;">Durée</th>
        </tr>`;
    
    // Format the new options in a table
    newOptions.forEach((option, index) => {
      const rowStyle = index % 2 === 0 ? 'background-color: #f2f2f2;' : '';
      const departureTime = formatDateTime(option.departureDate || option.departureDateTime);
      const arrivalTime = formatDateTime(option.arrivalDate || option.arrivalDateTime);
      
      // Calculate duration if both times are available
      let duration = '';
      try {
        if (option.departureDate && option.arrivalDate) {
          const depTime = new Date(option.departureDate);
          const arrTime = new Date(option.arrivalDate);
          const durationMs = arrTime - depTime;
          const hours = Math.floor(durationMs / (1000 * 60 * 60));
          const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
          duration = `${hours}h ${minutes}min`;
        }
      } catch (e) {
        console.error('Error calculating duration:', e);
      }
      
      const trainInfo = option.trainEquipment && option.trainNumber 
        ? `${option.trainEquipment} ${option.trainNumber}` 
        : option.trainType || 'Train';
      
      body += `
        <tr style="${rowStyle}">
          <td style="padding: 8px;">${departureTime}</td>
          <td style="padding: 8px;">${arrivalTime}</td>
          <td style="padding: 8px;">${trainInfo}</td>
          <td style="padding: 8px; text-align: center;">${duration}</td>
        </tr>`;
    });
    
    body += `
      </table>
      
      <p style="margin-top: 20px;">Réservez vos billets sur <a href="https://www.sncf-connect.com/" style="color: #0078d7;">SNCF Connect</a></p>
      
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
        <p>Cet email a été envoyé automatiquement par SNCF Travel Monitor. Vous recevez cette notification car vous vous êtes abonné(e) aux alertes pour ce trajet.</p>
      </div>
    </div>`;
    
    // Send the email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: body
    });
    
    console.log(`Notification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending notification email:', error);
    return false;
  }
}

/**
 * Format date string to DD/MM/YYYY
 * @param {String} dateStr - Date string in YYYY-MM-DD format
 * @returns {String} Formatted date as DD/MM/YYYY
 */
function formatDate(dateStr) {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Format date and time from ISO format
 * @param {string} dateTimeStr - ISO date string
 * @returns {string} - Formatted date and time
 */
function formatDateTime(dateTimeStr) {
  try {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateTimeStr || 'N/A';
  }
}

/**
 * Send confirmation email when a user subscribes
 * @param {String} email User's email address
 * @param {String} origin Origin station code
 * @param {String} destination Destination station code
 * @param {String} date Travel date
 * @param {Object} travelData Current travel data (optional)
 * @param {String} preferredTime Preferred departure time (optional)
 */
async function sendConfirmationEmail(email, origin, destination, date, currentData = null, preferredTime = null) {
  const originName = origin; // Ideally, map code to human-readable name
  const destinationName = destination; // Ideally, map code to human-readable name
  
  const timeInfo = preferredTime ? ` à ${preferredTime} (±1 heure)` : '';
  
  const subject = `Subscription Confirmed: SNCF Travel Monitor${timeInfo}`;
  
  // Create the email body
  let body = `
    <h2>Your subscription has been confirmed!</h2>
    <p>Thank you for using SNCF Travel Monitor!</p>
    <p>We will notify you when new travel options become available for:</p>
    <div style="margin: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9;">
      <p><strong>Route:</strong> ${originName} to ${destinationName}</p>
      <p><strong>Date:</strong> ${date}</p>
      ${preferredTime ? `<p><strong>Preferred Time:</strong> ${preferredTime} (±1 hour)</p>` : ''}
    </div>`;
  
  // Add current travel options if available
  if (currentData && currentData.proposals && currentData.proposals.length > 0) {
    body += `
    <h3>Currently Available Travel Options:</h3>
    <table style="width:100%; border-collapse: collapse;">
      <tr style="background-color: #f2f2f2;">
        <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Departure</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Arrival</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Train</th>
        <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Free Places</th>
      </tr>`;
      
    currentData.proposals.forEach(proposal => {
      body += `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatDateTime(proposal.departureDate)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatDateTime(proposal.arrivalDate)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${proposal.trainEquipment} ${proposal.trainNumber}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${proposal.freePlaces}</td>
      </tr>`;
    });
    
    body += `</table>`;
  } else {
    body += `<p>No travel options are currently available for this route and date. We will notify you when options become available.</p>`;
  }
  
  body += `
    <p>You will receive email notifications when new travel options are found for this route.</p>
    <p>Best regards,<br>SNCF Travel Monitor Team</p>
  `;
  
  // Send the email
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: body
    });
    console.log(`Confirmation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return false;
  }
}

module.exports = { sendNotification, sendConfirmationEmail };
