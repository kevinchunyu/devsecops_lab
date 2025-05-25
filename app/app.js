// app.js - Simplified vulnerable app with 3 main security issues
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('./database/userapp.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create tables and sample data
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email TEXT NOT NULL
    )
  `);

  // Create default admin user
  const hashedPassword = crypto.createHash('md5').update('admin123').digest('hex');
  db.run(
    'INSERT OR IGNORE INTO users (username, password, email) VALUES (?, ?, ?)',
    ['admin', hashedPassword, 'admin@example.com']
  );
});

// Hash password function
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// HOME PAGE
app.get('/', (req, res) => {
  res.send(`
    <h1>DevSecOps Vulnerable Application</h1>
    <p>This app contains 3 security vulnerabilities for educational purposes:</p>
    <ul>
      <li><strong>SQL Injection:</strong> POST /api/login</li>
      <li><strong>XSS:</strong> POST /api/register</li>
      <li><strong>Path Traversal:</strong> GET /api/download/:filename</li>
    </ul>
    <h3>Test Endpoints:</h3>
    <ul>
      <li><a href="/api/download/test.txt">Download test file</a></li>
    </ul>
    <h3>API Endpoints:</h3>
    <ul>
      <li>POST /api/login - Login with username/password</li>
      <li>POST /api/register - Register new user</li>
      <li>GET /api/download/:filename - Download files</li>
    </ul>
  `);
});

// VULNERABILITY 1: SQL INJECTION
// Students need to fix: Use parameterized queries
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const hashedPassword = hashPassword(password);

  // SQL Injection vulnerability - string concatenation
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${hashedPassword}'`;
  
  console.log(`Executing query: ${query}`);

  db.get(query, (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  });
});

// VULNERABILITY 2: CROSS-SITE SCRIPTING (XSS)
// Students need to fix: Validate and sanitize input
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const hashedPassword = hashPassword(password);

  db.run(
    'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
    [username, hashedPassword, email],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Registration failed' });
      }

      // XSS vulnerability - reflecting user input without sanitization
      res.json({
        success: true,
        message: `Welcome ${username}! Registration email sent to ${email}`,
        user: {
          id: this.lastID,
          username: username,
          email: email
        }
      });
    }
  );
});

// VULNERABILITY 3: PATH TRAVERSAL
// Students need to fix: Validate filename and restrict file access
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  
  // Path traversal vulnerability - no validation on filename
  const filePath = path.join(__dirname, 'public', 'downloads', filename);
  
  console.log(`Attempting to download: ${filePath}`);
  
  res.download(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: 'File not found' });
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3009;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vulnerable app running on port ${PORT}`);
  console.log('Ready for security testing!');
});