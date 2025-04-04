// public/js/login.js
document.addEventListener('DOMContentLoaded', function() {
    // Get reference to the login form
    const loginForm = document.getElementById('login-form');

    // Add submit event listener
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      // Send login request to API
      fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Store user data in localStorage
          localStorage.setItem('user', JSON.stringify(data.user));
          // Redirect to dashboard
          window.location.href = 'dashboard.html';
        } else {
          // Show error message
          const errorMessage = document.getElementById('error-message');
          errorMessage.textContent = data.error || 'Invalid credentials';
          errorMessage.style.display = 'block';
        }
      })
      .catch(error => {
        console.error('Login error:', error);
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.style.display = 'block';
      });
    });
  });