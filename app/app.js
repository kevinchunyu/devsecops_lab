// app.js - Main application file with deliberate vulnerabilities
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

// Vulnerability: Hardcoded credentials in code
const DB_CONFIG = {
  connectionString: "localhost:5432/appdb",
  username: "db_user",
  password: "Password123!"
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
      // Vulnerability: Weak password hashing (MD5)
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
              [1, 'Security Reminder', '<script>alert("XSS vulnerability!");</script> Remember to change your default password.']
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
      // Vulnerability: Weak password hashing (MD5)
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

// Vulnerability: Weak password hashing
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// Vulnerability: SQL Injection
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = hashPassword(password);

  // SQL Injection vulnerability
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

    // Vulnerability: Cookies without secure flag
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

  // Vulnerability: No input validation or sanitization
  if (!username || !password || !email) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const hashedPassword = hashPassword(password);

  db.run(
    'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
    [username, hashedPassword, email],
    function(err) {
      if (err) {
        // Vulnerability: Detailed error exposure
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

// Vulnerability: Broken Access Control - Missing proper authentication
app.get('/api/dashboard/stats', (req, res) => {
  // Should check user authentication here but doesn't
  
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

// Vulnerability: SQL Injection + Missing Authorization 
app.get('/api/notes', (req, res) => {
  const userId = req.cookies.userId;
  const isAdmin = req.cookies.isAdmin === 'true';

  // Missing authentication check here

  // SQL Injection vulnerability
  let query = `SELECT * FROM notes WHERE user_id = ${userId}`;

  // Admin can see all notes
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

// Vulnerability: XSS in note content
app.get('/api/note/:id', (req, res) => {
  const noteId = req.params.id;
  
  // Missing authorization check - any user can access any note
  
  db.get('SELECT * FROM notes WHERE id = ?', [noteId], (err, note) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // No access control check, no content sanitization
    res.json(note);
  });
});

// Vulnerability: XSS through note creation
app.post('/api/notes', (req, res) => {
  const { title, content } = req.body;
  const userId = req.cookies.userId;

  // No input validation or sanitization
  
  db.run(
    'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
    [userId, title, content],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create note', details: err.message });
      }

      res.json({
        id: this.lastID,
        user_id: userId,
        title,
        content,
        created_at: new Date().toISOString()
      });
    }
  );
});

// Vulnerability: Command Injection in database backup
app.post('/api/admin/backup-db', (req, res) => {
  // Using cookie for admin check instead of proper session validation
  const isAdmin = req.cookies.isAdmin === 'true';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  // Command injection vulnerability
  const backupCommand = `sqlite3 ./database/userapp.db .dump > ./backups/${filename}.sql`;

  console.log(`Executing command: ${backupCommand}`); // For demonstration purposes

  exec(backupCommand, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: 'Backup failed', details: stderr });
    }

    res.json({ success: true, filename: `${filename}.sql` });
  });
});

// Vulnerability: Privilege escalation via insecure admin checks
app.get('/api/admin/users', (req, res) => {
  // Get data first before checking authorization
  db.all('SELECT id, username, email, is_admin FROM users', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    // Check admin status AFTER data is fetched
    const isAdmin = req.cookies.isAdmin === 'true';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(users);
  });
});

// Vulnerability: Unsecured admin action
app.post('/api/admin/delete-user/:id', (req, res) => {
  const userId = req.params.id;
  
  // Using cookie for admin check instead of proper validation
  const isAdmin = req.cookies.isAdmin === 'true';
  
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user', details: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true });
  });
});

// Vulnerability: Directory traversal in file download
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // No validation on the filename parameter, allowing path traversal
  const filePath = path.join(__dirname, 'public', 'downloads', filename);
  
  // This could allow accessing files outside the intended directory
  res.sendFile(filePath);
});

// Vulnerability: Cross-Site Request Forgery (CSRF) - no CSRF token 
app.post('/api/user/update-email', (req, res) => {
  const userId = req.cookies.userId;
  const { email } = req.body;
  
  // No CSRF protection
  
  db.run('UPDATE users SET email = ? WHERE id = ?', [email, userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update email', details: err.message });
    }
    
    res.json({ success: true });
  });
});

// Start server
const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});