/**
 * Compare previous and current data to find new travel options
 * @param {Object} previousData Previous API response data
 * @param {Object} currentData Current API response data
 * @param {String} preferredTime Optional preferred time (format: HH:MM)
 * @returns {Array} Array of new travel options
 */
function findNewOptions(previousData, currentData, preferredTime = null) {
  // If there's no previous data, all current options are new
  if (!previousData) {
    // If preferred time is specified, filter the options first
    if (preferredTime) {
      return filterByPreferredTime(currentData, preferredTime);
    }
    return currentData;
  }

  // Extract journey IDs from previous data
  const previousIds = new Set();
  if (previousData.journeys && Array.isArray(previousData.journeys)) {
    previousData.journeys.forEach(journey => {
      if (journey.id) {
        previousIds.add(journey.id);
      }
    });
  }

  // Find new journeys that weren't in the previous data
  const newOptions = [];
  if (currentData.journeys && Array.isArray(currentData.journeys)) {
    currentData.journeys.forEach(journey => {
      if (journey.id && !previousIds.has(journey.id)) {
        newOptions.push(journey);
      }
    });
  }

  // Filter by preferred time if provided
  if (preferredTime && newOptions.length > 0) {
    return filterByPreferredTime(newOptions, preferredTime);
  }

  return newOptions;
}

/**
 * Filter journeys based on preferred time +/- 1 hour
 * @param {Array} journeys List of journeys to filter
 * @param {String} preferredTime Preferred departure time (format: HH:MM)
 * @returns {Array} Filtered journeys
 */
function filterByPreferredTime(journeys, preferredTime) {
  if (!preferredTime || !journeys || journeys.length === 0) {
    return journeys;
  }

  // Parse preferred time to hours and minutes
  const [prefHours, prefMinutes] = preferredTime.split(':').map(Number);
  const preferredMinutes = prefHours * 60 + prefMinutes;

  // Define the acceptable time range (±1 hour)
  const minMinutes = preferredMinutes - 60;
  const maxMinutes = preferredMinutes + 60;

  // Filter journeys based on departure time
  return journeys.filter(journey => {
    if (journey.departureDate) {
      const departureDate = new Date(journey.departureDate);
      const departureMinutes = departureDate.getHours() * 60 + departureDate.getMinutes();
      
      return departureMinutes >= minMinutes && departureMinutes <= maxMinutes;
    }
    return false;
  });
}

module.exports = { findNewOptions };
