/**
 * Compare previous and current data to find new travel options
 * @param {Object} previousData - Previous API response data
 * @param {Object} currentData - Current API response data
 * @returns {Array} New travel options
 */
function findNewOptions(previousData, currentData) {
  if (!previousData) {
    // If there's no previous data, consider all current options as new
    return extractTravelOptions(currentData);
  }

  const prevOptions = extractTravelOptions(previousData);
  const currOptions = extractTravelOptions(currentData);

  // Find new options (those in current data but not in previous data)
  return currOptions.filter(currOpt => {
    return !prevOptions.some(prevOpt => 
      prevOpt.departureDateTime === currOpt.departureDateTime &&
      prevOpt.arrivalDateTime === currOpt.arrivalDateTime &&
      prevOpt.trainNumber === currOpt.trainNumber
    );
  });
}

/**
 * Extract travel options from API response
 * Adapted to the actual structure of the SNCF API response
 */
function extractTravelOptions(data) {
  if (!data || !data.proposals) {
    return [];
  }
  
  // Extract the relevant information from each travel option
  return data.proposals.map(proposal => {
    // Extract the necessary details based on the actual data structure
    return {
      departureDateTime: proposal.departureDate,
      arrivalDateTime: proposal.arrivalDate,
      trainNumber: proposal.trainNumber,
      trainEquipment: proposal.trainEquipment,
      origin: proposal.origin ? proposal.origin.label : '',
      destination: proposal.destination ? proposal.destination.label : '',
      freePlaces: proposal.freePlaces || 0,
      price: 'N/A' // Price information not available in the example data
    };
  });
}

module.exports = { findNewOptions };
