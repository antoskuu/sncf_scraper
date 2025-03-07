document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('subscription-form');
  const messageDiv = document.getElementById('message');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Cookie utility functions
  const cookieUtils = {
    setCookie: function(name, value, days) {
      let expires = '';
      if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
      }
      document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
    },
    
    getCookie: function(name) {
      const nameEQ = name + '=';
      const ca = document.cookie.split(';');
      for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
      return null;
    },
    
    deleteCookie: function(name) {
      document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
  };
  
  // Load saved email from cookie
  const savedEmail = cookieUtils.getCookie('user_email');
  if (savedEmail) {
    document.getElementById('email').value = savedEmail;
    document.getElementById('remember-email').checked = true;
    
    const searchEmail = document.getElementById('search-email');
    if (searchEmail) {
      searchEmail.value = savedEmail;
      document.getElementById('remember-search-email').checked = true;
    }
  }
  
  // Set minimum date to today
  const dateInput = document.getElementById('date');
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  dateInput.min = formattedDate;
  
  // Load stations for select dropdowns
  loadStations();
  
  // Handle tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Remove active class from all buttons and tabs
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(tab => tab.classList.remove('active'));
      
      // Add active class to clicked button and corresponding tab
      const tabId = this.getAttribute('data-tab');
      this.classList.add('active');
      document.getElementById(`${tabId}-tab`).classList.add('active');
      
      // Clear any messages
      messageDiv.textContent = '';
      messageDiv.className = 'message';
    });
  });
  
  // Handle subscription form submission
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const email = document.getElementById('email').value;
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    const date = document.getElementById('date').value;
    const rememberEmail = document.getElementById('remember-email').checked;
    
    // Handle remember email option
    if (rememberEmail) {
      cookieUtils.setCookie('user_email', email, 30); // Save email for 30 days
    } else {
      cookieUtils.deleteCookie('user_email');
    }
    
    // Clear any previous messages
    messageDiv.textContent = '';
    messageDiv.className = 'message';
    
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, origin, destination, date })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        messageDiv.textContent = 'Subscription successful! Check your email for confirmation. You will receive notifications when new travel options are found.';
        messageDiv.className = 'message success';
        
        // Instead of form.reset(), reset only specific fields but keep email if needed
        document.getElementById('origin').value = '';
        document.getElementById('destination').value = '';
        document.getElementById('date').value = '';
        
        // Keep email if "remember me" is checked
        if (!rememberEmail) {
          document.getElementById('email').value = '';
        }
      } else {
        messageDiv.textContent = data.error || 'An error occurred. Please try again.';
        messageDiv.className = 'message error';
      }
    } catch (error) {
      messageDiv.textContent = 'Network error. Please check your connection and try again.';
      messageDiv.className = 'message error';
      console.error('Error:', error);
    }
  });
  
  // Handle subscription search
  const searchBtn = document.getElementById('search-btn');
  const searchEmail = document.getElementById('search-email');
  const subscriptionsList = document.getElementById('subscriptions-list');
  const noSubscriptionsMessage = document.getElementById('no-subscriptions');
  
  // Remember search email checkbox
  const rememberSearchEmail = document.getElementById('remember-search-email');
  if (rememberSearchEmail) {
    rememberSearchEmail.addEventListener('change', function() {
      if (this.checked && searchEmail.value) {
        cookieUtils.setCookie('user_email', searchEmail.value, 30);
      } else if (!this.checked) {
        cookieUtils.deleteCookie('user_email');
      }
    });
  }
  
  searchBtn.addEventListener('click', async function() {
    const email = searchEmail.value.trim();
    
    if (!email) {
      messageDiv.textContent = 'Please enter your email address';
      messageDiv.className = 'message error';
      return;
    }
    
    // Handle remember email option
    if (document.getElementById('remember-search-email').checked) {
      cookieUtils.setCookie('user_email', email, 30); // Save email for 30 days
    }
    
    try {
      const response = await fetch('/api/subscriptions');
      const subscriptions = await response.json();
      
      // Filter subscriptions for the entered email
      const userSubscriptions = subscriptions.filter(sub => sub.email === email);
      
      // Display the subscriptions or a message if none found
      if (userSubscriptions.length > 0) {
        noSubscriptionsMessage.classList.add('hidden');
        subscriptionsList.innerHTML = '';
        
        userSubscriptions.forEach(sub => {
          const subItem = document.createElement('div');
          subItem.className = 'subscription-item';
          
          // Get station names from codes
          getStationDisplayInfo(sub).then(displayInfo => {
            subItem.innerHTML = `
              <div class="subscription-details">
                <p><strong>Route:</strong> ${displayInfo.originName} → ${displayInfo.destinationName}</p>
                <p><strong>Date:</strong> ${sub.date}</p>
              </div>
              <div class="subscription-actions">
                <button class="delete-btn" data-email="${sub.email}" data-origin="${sub.origin}" data-destination="${sub.destination}" data-date="${sub.date}">Delete</button>
              </div>
            `;
            
            subscriptionsList.appendChild(subItem);
            
            // Add event listeners to delete buttons
            document.querySelectorAll('.delete-btn').forEach(btn => {
              btn.addEventListener('click', deleteSubscription);
            });
          });
        });
      } else {
        subscriptionsList.innerHTML = '';
        noSubscriptionsMessage.classList.remove('hidden');
      }
    } catch (error) {
      messageDiv.textContent = 'Failed to fetch subscriptions. Please try again.';
      messageDiv.className = 'message error';
      console.error('Error:', error);
    }
  });
  
  // Function to delete a subscription
  async function deleteSubscription(e) {
    const btn = e.target;
    const email = btn.getAttribute('data-email');
    const origin = btn.getAttribute('data-origin');
    const destination = btn.getAttribute('data-destination');
    const date = btn.getAttribute('data-date');
    
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, origin, destination, date })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Remove the subscription item from the UI
        btn.closest('.subscription-item').remove();
        
        // Check if there are any subscriptions left
        if (document.querySelectorAll('.subscription-item').length === 0) {
          noSubscriptionsMessage.classList.remove('hidden');
        }
        
        messageDiv.textContent = 'Subscription deleted successfully';
        messageDiv.className = 'message success';
      } else {
        messageDiv.textContent = data.error || 'Failed to delete subscription';
        messageDiv.className = 'message error';
      }
    } catch (error) {
      messageDiv.textContent = 'Network error. Please check your connection and try again.';
      messageDiv.className = 'message error';
      console.error('Error:', error);
    }
  }
  
  // Function to load stations into dropdowns
  async function loadStations() {
    try {
      const response = await fetch('/api/stations');
      if (!response.ok) {
        throw new Error('Failed to fetch stations');
      }
      
      const stations = await response.json();
      
      const originSelect = document.getElementById('origin');
      const destinationSelect = document.getElementById('destination');
      
      // Clear existing options
      originSelect.innerHTML = '<option value="">Select origin station</option>';
      destinationSelect.innerHTML = '<option value="">Select destination station</option>';
      
      // Add options for each station
      stations.forEach(station => {
        const originOption = document.createElement('option');
        originOption.value = station.code;
        originOption.textContent = `${station.name} (${station.code})`;
        originSelect.appendChild(originOption);
        
        const destOption = document.createElement('option');
        destOption.value = station.code;
        destOption.textContent = `${station.name} (${station.code})`;
        destinationSelect.appendChild(destOption);
      });
    } catch (error) {
      console.error('Error loading stations:', error);
      messageDiv.textContent = 'Failed to load station information. Please refresh the page.';
      messageDiv.className = 'message error';
    }
  }
  
  // Function to get station display information
  async function getStationDisplayInfo(subscription) {
    try {
      const response = await fetch('/api/stations');
      const stations = await response.json();
      
      let originName = subscription.origin;
      let destinationName = subscription.destination;
      
      // Find station names
      const originStation = stations.find(station => station.code === subscription.origin);
      if (originStation) {
        originName = originStation.name;
      }
      
      const destinationStation = stations.find(station => station.code === subscription.destination);
      if (destinationStation) {
        destinationName = destinationStation.name;
      }
      
      return {
        originName,
        destinationName
      };
    } catch (error) {
      console.error('Error fetching station info:', error);
      return {
        originName: subscription.origin,
        destinationName: subscription.destination
      };
    }
  }
});
