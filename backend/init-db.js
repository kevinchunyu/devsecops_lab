// init-db.js
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create backups directory if it doesn't exist
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Function to hash passwords (insecure by design - using MD5)
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// Initialize SQLite database
const db = new sqlite3.Database('./database/userapp.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database');
});

// Create database schema and add sample data
db.serialize(() => {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create notes table
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Check if admin user exists, create default if not
  db.get("SELECT id FROM users WHERE username = 'admin'", (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err.message);
      return;
    }
    
    if (!row) {
      // Create admin user (admin/admin123)
      const adminPassword = hashPassword('admin123');
      
      db.run(
        'INSERT INTO users (username, password, email, is_admin) VALUES (?, ?, ?, ?)',
        ['admin', adminPassword, 'admin@example.com', 1],
        function(err) {
          if (err) {
            console.error('Error creating admin user:', err.message);
          } else {
            console.log('Default admin user created (username: admin, password: admin123)');
            
            // Create sample notes for admin
            db.run(
              'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
              [this.lastID, 'Welcome Note', 'Welcome to the dashboard! This is a sample note.']
            );
            db.run(
              'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
              [this.lastID, 'Security Reminder', 'Remember to change your default password.']
            );
          }
        }
      );
    } else {
      console.log('Admin user already exists');
    }
  });
  
  // Check if regular user exists, create default if not
  db.get("SELECT id FROM users WHERE username = 'user'", (err, row) => {
    if (err) {
      console.error('Error checking regular user:', err.message);
      return;
    }
    
    if (!row) {
      // Create regular user (user/password)
      const userPassword = hashPassword('password');
      
      db.run(
        'INSERT INTO users (username, password, email, is_admin) VALUES (?, ?, ?, ?)',
        ['user', userPassword, 'user@example.com', 0],
        function(err) {
          if (err) {
            console.error('Error creating regular user:', err.message);
          } else {
            console.log('Default regular user created (username: user, password: password)');
            
            // Create sample note for user
            db.run(
              'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
              [this.lastID, 'My First Note', 'This is my private note that only I should be able to see.']
            );
          }
        }
      );
    } else {
      console.log('Regular user already exists');
    }
  });
});

// Wait for data to be inserted
setTimeout(() => {
  // Close the database connection
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database initialization completed. Closed the database connection.');
    }
  });
}, 1000);