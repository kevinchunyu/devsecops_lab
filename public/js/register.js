// public/js/register.js
document.addEventListener('DOMContentLoaded', function() {
    // Get reference to the register form
    const registerForm = document.getElementById('register-form');
    
    // Add submit event listener
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      
      // Check if passwords match
      if (password !== confirmPassword) {
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = 'Passwords do not match';
        errorMessage.style.display = 'block';
        return;
      }
      
      // Send registration request to API
      fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Registration successful! You can now login.');
          window.location.href = 'index.html';
        } else {
          const errorMessage = document.getElementById('error-message');
          errorMessage.textContent = data.error || 'Registration failed';
          errorMessage.style.display = 'block';
        }
      })
      .catch(error => {
        console.error('Registration error:', error);
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.style.display = 'block';
      });
    });
  });