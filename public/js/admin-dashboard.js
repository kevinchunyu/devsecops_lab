// public/js/admin-dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is admin
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    if (!user) {
      window.location.href = '../index.html';
      return;
    }
    
    // Client-side admin check (vulnerable by design)
    if (!user.isAdmin) {
      document.getElementById('admin-check').innerHTML = `
        <div class="alert alert-danger">
          You don't have admin privileges.
          <button class="btn btn-primary btn-sm ms-3" onclick="window.location.href='../dashboard.html'">
            Back to Dashboard
          </button>
        </div>
      `;
      // Hide admin content
      document.querySelectorAll('.card').forEach(el => {
        el.style.display = 'none';
      });
      return;
    }
    
    // Update UI
    document.getElementById('user-greeting').textContent = `Welcome, ${user.username}!`;
    
    // Event listeners
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('load-users-btn').addEventListener('click', loadUsers);
    document.getElementById('backup-form').addEventListener('submit', createBackup);
  });
  
  function loadUsers() {
    fetch('/api/admin/users')
      .then(response => response.json())
      .then(users => {
        let html = `
          <table class="table table-striped">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Admin</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        users.forEach(user => {
          html += `
            <tr>
              <td>${user.id}</td>
              <td>${user.username}</td>
              <td>${user.email}</td>
              <td>${user.is_admin ? 'Yes' : 'No'}</td>
            </tr>
          `;
        });
        
        html += `
            </tbody>
          </table>
        `;
        
        document.getElementById('users-table').innerHTML = html;
      })
      .catch(error => {
        console.error('Error loading users:', error);
        document.getElementById('users-table').innerHTML = '<div class="alert alert-danger">Error loading users</div>';
      });
  }
  
  function createBackup(e) {
    e.preventDefault();
    
    const filename = document.getElementById('backup-filename').value;
    
    fetch('/api/admin/backup-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ filename })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        document.getElementById('backup-result').innerHTML = `
          <div class="alert alert-success">
            Backup created successfully: ${data.filename}
          </div>
        `;
      } else {
        document.getElementById('backup-result').innerHTML = `
          <div class="alert alert-danger">
            ${data.error || 'Backup failed'}
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('Error creating backup:', error);
      document.getElementById('backup-result').innerHTML = '<div class="alert alert-danger">Error creating backup</div>';
    });
  }
  
  function logout() {
    fetch('/api/logout')
      .then(() => {
        localStorage.removeItem('user');
        window.location.href = '../index.html';
      })
      .catch(error => {
        console.error('Logout error:', error);
        localStorage.removeItem('user');
        window.location.href = '../index.html';
      });
  }