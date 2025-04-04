// public/js/dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    // Update UI
    document.getElementById('user-greeting').textContent = `Welcome, ${user.username}!`;

    // Show admin link if admin
    if (user.isAdmin) {
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'block';
      });
    }

    // Load data
    loadDatabaseStats();
    loadUserNotes();

    // Add logout handler
    document.getElementById('logout-btn').addEventListener('click', logout);
  });

  function loadDatabaseStats() {
    fetch('/api/dashboard/stats')
      .then(response => response.json())
      .then(data => {
        let html = `<ul class="list-group">`;
        html += `<li class="list-group-item">Tables: <span class="badge bg-primary">${data.tables.length}</span></li>`;
        html += `<li class="list-group-item">Users: <span class="badge bg-primary">${data.userCount}</span></li>`;
        html += `<li class="list-group-item">Notes: <span class="badge bg-primary">${data.noteCount}</span></li>`;
        html += `</ul>`;

        document.getElementById('database-stats').innerHTML = html;
      })
      .catch(error => {
        console.error('Error loading stats:', error);
        document.getElementById('database-stats').innerHTML = 'Error loading statistics';
      });
  }

  function loadUserNotes() {
    fetch('/api/notes')
      .then(response => response.json())
      .then(notes => {
        if (notes.length === 0) {
          document.getElementById('user-notes').innerHTML = '<p>You have no notes.</p>';
          return;
        }

        let html = '';
        notes.forEach(note => {
          html += `
            <div class="card mb-2">
              <div class="card-header">${note.title}</div>
              <div class="card-body">
                <p>${note.content}</p>
                <small class="text-muted">Created: ${new Date(note.created_at).toLocaleString()}</small>
              </div>
            </div>
          `;
        });

        document.getElementById('user-notes').innerHTML = html;
      })
      .catch(error => {
        console.error('Error loading notes:', error);
        document.getElementById('user-notes').innerHTML = 'Error loading notes';
      });
  }

  function logout() {
    fetch('/api/logout')
      .then(() => {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
      })
      .catch(error => {
        console.error('Logout error:', error);
        localStorage.removeItem('user');
        window.location.href = 'index.html';
      });
  }