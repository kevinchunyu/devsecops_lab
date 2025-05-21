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
        <i class="fas fa-exclamation-triangle me-2"></i>You don't have admin privileges.
        <button class="btn btn-primary btn-sm ms-3" onclick="window.location.href='../dashboard.html'">
          <i class="fas fa-arrow-left me-1"></i>Back to Dashboard
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
  const loadBtn = document.getElementById('load-users-btn');
  loadBtn.disabled = true;
  loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';
  
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
        const adminBadge = user.is_admin 
          ? '<span class="badge bg-primary">Yes</span>' 
          : '<span class="badge bg-secondary">No</span>';
          
        html += `
          <tr>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${adminBadge}</td>
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
      document.getElementById('users-table').innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle me-2"></i>Error loading users</div>';
    })
    .finally(() => {
      loadBtn.disabled = false;
      loadBtn.innerHTML = '<i class="fas fa-users me-2"></i>Load All Users';
    });
}

function createBackup(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
  
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
          <i class="fas fa-check-circle me-2"></i>Backup created successfully: ${data.filename}
        </div>
      `;
    } else {
      document.getElementById('backup-result').innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-times-circle me-2"></i>${data.error || 'Backup failed'}
        </div>
      `;
    }
  })
  .catch(error => {
    console.error('Error creating backup:', error);
    document.getElementById('backup-result').innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle me-2"></i>Error creating backup</div>';
  })
  .finally(() => {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
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
}// public/js/admin-dashboard.js
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
        <i class="fas fa-exclamation-triangle me-2"></i>You don't have admin privileges.
        <button class="btn btn-primary btn-sm ms-3" onclick="window.location.href='../dashboard.html'">
          <i class="fas fa-arrow-left me-1"></i>Back to Dashboard
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
  const loadBtn = document.getElementById('load-users-btn');
  loadBtn.disabled = true;
  loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';
  
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
        const adminBadge = user.is_admin 
          ? '<span class="badge bg-primary">Yes</span>' 
          : '<span class="badge bg-secondary">No</span>';
          
        html += `
          <tr>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${adminBadge}</td>
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
      document.getElementById('users-table').innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle me-2"></i>Error loading users</div>';
    })
    .finally(() => {
      loadBtn.disabled = false;
      loadBtn.innerHTML = '<i class="fas fa-users me-2"></i>Load All Users';
    });
}

function createBackup(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
  
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
          <i class="fas fa-check-circle me-2"></i>Backup created successfully: ${data.filename}
        </div>
      `;
    } else {
      document.getElementById('backup-result').innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-times-circle me-2"></i>${data.error || 'Backup failed'}
        </div>
      `;
    }
  })
  .catch(error => {
    console.error('Error creating backup:', error);
    document.getElementById('backup-result').innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle me-2"></i>Error creating backup</div>';
  })
  .finally(() => {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
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