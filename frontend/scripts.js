// Base URL for backend API
const API_BASE = 'http://localhost:3009';

// Dark Mode Toggle
const darkModeToggle = document.getElementById('darkModeToggle');
const prefersDark = localStorage.getItem('darkMode') === 'true';

if (prefersDark) {
  document.body.classList.add('dark');
  darkModeToggle.checked = true;
}

darkModeToggle.addEventListener('change', function () {
  if (this.checked) {
    document.body.classList.add('dark');
    localStorage.setItem('darkMode', 'true');
  } else {
    document.body.classList.remove('dark');
    localStorage.setItem('darkMode', 'false');
  }
});

// Login Handler
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    const output = document.getElementById('loginResponse');

    if (data.success) {
      output.textContent = '';

      // Hide login/register sections
      document.getElementById('loginSection').style.display = 'none';
      document.getElementById('registerSection').style.display = 'none';

      // Create dashboard view
      const dashboard = document.createElement('section');
      dashboard.className = 'card';
      dashboard.innerHTML = `
        <h2>👋 Welcome, ${data.user.username}</h2>
        <p>Email: ${data.user.email}</p>
        <p>You are now logged in! Feel free to download files or explore the app.</p>
      `;

      const logoutBtn = document.createElement('button');
      logoutBtn.textContent = 'Logout';
      logoutBtn.className = 'logout';
      logoutBtn.style.marginTop = '1rem';
      logoutBtn.onclick = () => location.reload();

      dashboard.appendChild(logoutBtn);
      document.querySelector('.app-container').appendChild(dashboard);
    } else {
      output.textContent = `❌ ${data.error}`;
    }
  } catch (err) {
    console.error('Login error:', err);
    document.getElementById('loginResponse').textContent = '❌ Server error';
  }
});

// Register Handler
document.getElementById('registerForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  try {
    const response = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();
    const output = document.getElementById('registerResponse');
    output.innerHTML = data.message;
  } catch (err) {
    console.error('Registration error:', err);
    document.getElementById('registerResponse').textContent = '❌ Server error';
  }
});

// File Download
document.getElementById('downloadBtn').addEventListener('click', () => {
  const filename = document.getElementById('filename').value;
  if (filename) {
    window.location.href = `${API_BASE}/api/download/${encodeURIComponent(filename)}`;
  }
});
