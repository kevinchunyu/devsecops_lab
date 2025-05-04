// app.js - Main application file
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const { exec } = require('child_process');

// Initialize Express app
const app = express();

// Configure middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// A02: Cryptographic Failures - Hardcoded API keys
const DB_CONFIG = {
  connectionString: "localhost:5432/appdb",
  username: "db_user",
  password: "Password123!"  // Hardcoded sensitive credential
};

// Initialize SQLite database
const db = new sqlite3.Database('./database/userapp.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database');
  }
});

// Create tables if they don't exist
db.serialize(() => {
  // Users table
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

  // Notes table for demonstration
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
      // A02: Cryptographic Failures - Weak hashing
      const hashedPassword = crypto.createHash('md5').update('admin123').digest('hex');

      db.run(
        'INSERT INTO users (username, password, email, is_admin) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'admin@example.com', 1],
        (err) => {
          if (err) {
            console.error('Error creating admin user:', err.message);
          } else {
            console.log('Default admin user created');

            // Create sample notes for admin
            db.run(
              'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
              [1, 'Welcome Note', 'Welcome to the dashboard! This is a sample note.']
            );
            db.run(
              'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
              [1, 'Security Reminder', 'Remember to change your default password.']
            );
          }
        }
      );
    }
  });

  // Add a regular user if it doesn't exist
  db.get("SELECT id FROM users WHERE username = 'user'", (err, row) => {
    if (err) {
      console.error('Error checking user:', err.message);
      return;
    }

    if (!row) {
      // A02: Cryptographic Failures - Weak hashing
      const hashedPassword = crypto.createHash('md5').update('password').digest('hex');

      db.run(
        'INSERT INTO users (username, password, email, is_admin) VALUES (?, ?, ?, ?)',
        ['user', hashedPassword, 'user@example.com', 0],
        (err) => {
          if (err) {
            console.error('Error creating regular user:', err.message);
          } else {
            console.log('Default regular user created');

            // Create sample note for user
            db.run(
              'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
              [2, 'My First Note', 'This is a private note only I should see.']
            );
          }
        }
      );
    }
  });
});

// AUTHENTICATION ROUTES
// =====================

// A02: Cryptographic Failures - Weak hashing
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// A03: Injection - SQL Injection in login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = hashPassword(password);

  // A03: SQL Injection vulnerability
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${hashedPassword}'`;

  console.log(`Executing query: ${query}`); // For demonstration purposes

  db.get(query, (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session (simplified for demo)
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    res.cookie('sessionId', sessionId, { httpOnly: true });
    res.cookie('userId', user.id, { httpOnly: true });
    res.cookie('isAdmin', user.is_admin === 1, { httpOnly: true });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin === 1
      }
    });
  });
});

app.post('/api/register', (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const hashedPassword = hashPassword(password);

  db.run(
    'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
    [username, hashedPassword, email],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Registration failed', details: err.message });
      }

      res.json({
        success: true,
        user: {
          id: this.lastID,
          username,
          email,
          isAdmin: false
        }
      });
    }
  );
});

app.get('/api/logout', (req, res) => {
  res.clearCookie('sessionId');
  res.clearCookie('userId');
  res.clearCookie('isAdmin');
  res.json({ success: true });
});

// DASHBOARD ROUTES
// ===============

// A01: Broken Access Control - Missing proper authorization
app.get('/api/dashboard/stats', (req, res) => {
  // Should check user authentication here

  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    db.get("SELECT COUNT(*) as userCount FROM users", (err, userCount) => {
      if (err) {
        return res.status(500).json({ error: 'Database error', details: err.message });
      }

      db.get("SELECT COUNT(*) as noteCount FROM notes", (err, noteCount) => {
        if (err) {
          return res.status(500).json({ error: 'Database error', details: err.message });
        }

        res.json({
          tables: tables.map(t => t.name),
          userCount: userCount.userCount,
          noteCount: noteCount.noteCount
        });
      });
    });
  });
});

// A01: Broken Access Control - Missing proper authorization
app.get('/api/notes', (req, res) => {
  const userId = req.cookies.userId;
  const isAdmin = req.cookies.isAdmin === 'true';

  // Missing authorization - should check if the user is authenticated

  // A03: SQL Injection vulnerability (if userId is manipulated)
  let query = `SELECT * FROM notes WHERE user_id = ${userId}`;

  // Admin can see all notes (but implementation is flawed)
  if (isAdmin) {
    query = `SELECT notes.*, users.username FROM notes JOIN users ON notes.user_id = users.id`;
  }

  console.log(`Executing query: ${query}`); // For demonstration purposes

  db.all(query, (err, notes) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    res.json(notes);
  });
});

// A03: Command Injection in database backup
app.post('/api/admin/backup-db', (req, res) => {
  const isAdmin = req.cookies.isAdmin === 'true';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  // A03: Command injection vulnerability
  const backupCommand = `sqlite3 ./database/userapp.db .dump > ./backups/${filename}.sql`;

  console.log(`Executing command: ${backupCommand}`); // For demonstration purposes

  exec(backupCommand, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Backup failed', details: stderr });
    }

    res.json({ success: true, filename: `${filename}.sql` });
  });
});

// API endpoint to get all users (admin only)
app.get('/api/admin/users', (req, res) => {
  // A01: Broken Access Control - Late authorization check
  db.all('SELECT id, username, email, is_admin FROM users', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    // Check admin status AFTER data is fetched (vulnerable)
    const isAdmin = req.cookies.isAdmin === 'true';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(users);
  });
});

// Start server
const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});