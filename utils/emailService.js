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
 */
async function sendNotification(email, origin, destination, date, newOptions) {
  const originName = origin; // Ideally, map code to human-readable name
  const destinationName = destination; // Ideally, map code to human-readable name
  
  const subject = `New Travel Option: ${originName} to ${destinationName} on ${date}`;
  
  // Create the email body
  let body = `<h2>New travel options found!</h2>
    <p>Route: ${originName} to ${destinationName}</p>
    <p>Date: ${date}</p>
    <h3>New Options:</h3>
    <ul>`;
  
  // Format the new options (adapt this based on the actual structure of your data)
  newOptions.forEach(option => {
    body += `<li>Departure: ${option.departureDateTime} - Arrival: ${option.arrivalDateTime} - Price: ${option.price} €</li>`;
  });
  
  body += `</ul>
    <p>Book your tickets on <a href="https://www.sncf-connect.com/">SNCF Connect</a></p>`;
  
  // Send the email
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: body
    });
    console.log(`Notification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Format date and time from ISO format
 * @param {string} dateTimeStr - ISO date string
 * @returns {string} - Formatted date and time
 */
function formatDateTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Send confirmation email when a user subscribes
 */
async function sendConfirmationEmail(email, origin, destination, date, currentData) {
  const originName = origin; // Ideally, map code to human-readable name
  const destinationName = destination; // Ideally, map code to human-readable name
  
  const subject = `Subscription Confirmed: SNCF Travel Monitor`;
  
  // Create the email body
  let body = `
    <h2>Your subscription has been confirmed!</h2>
    <p>Thank you for using SNCF Travel Monitor!</p>
    <p>We will notify you when new travel options become available for:</p>
    <div style="margin: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9;">
      <p><strong>Route:</strong> ${originName} to ${destinationName}</p>
      <p><strong>Date:</strong> ${date}</p>
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
