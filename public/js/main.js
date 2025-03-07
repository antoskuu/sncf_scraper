document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('subscription-form');
  const messageDiv = document.getElementById('message');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Set minimum date to today
  const dateInput = document.getElementById('date');
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  dateInput.min = formattedDate;
  
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
    const origin = document.getElementById('origin').value.trim().toUpperCase();
    const destination = document.getElementById('destination').value.trim().toUpperCase();
    const date = document.getElementById('date').value;
    
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
        form.reset();
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
  
  searchBtn.addEventListener('click', async function() {
    const email = searchEmail.value.trim();
    
    if (!email) {
      messageDiv.textContent = 'Please enter your email address';
      messageDiv.className = 'message error';
      return;
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
          
          subItem.innerHTML = `
            <div class="subscription-details">
              <p><strong>Route:</strong> ${sub.origin} → ${sub.destination}</p>
              <p><strong>Date:</strong> ${sub.date}</p>
            </div>
            <div class="subscription-actions">
              <button class="delete-btn" data-email="${sub.email}" data-origin="${sub.origin}" data-destination="${sub.destination}" data-date="${sub.date}">Delete</button>
            </div>
          `;
          
          subscriptionsList.appendChild(subItem);
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', deleteSubscription);
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
});
