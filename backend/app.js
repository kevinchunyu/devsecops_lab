// app.js - Simplified vulnerable app with 3 main security issues
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors()); // Allow cross-origin requests (optional: restrict to frontend origin)
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

// Hash password function
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// Ensure downloads directory exists
const downloadsDir = path.join(__dirname, 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
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
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send('<p>All fields are required</p>');
  }

  const hashedPassword = hashPassword(password);

  db.run(
    'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
    [username, hashedPassword, email],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).send('<p>Registration failed</p>');
      }

      res.json({
        success: true,
        message: `Welcome ${username}! Registration email sent to ${email}`
      });
    }
  );
});

// VULNERABILITY 3: PATH TRAVERSAL
app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;

  // Path traversal vulnerability - no sanitization
  const filePath = path.join(__dirname, 'public', 'downloads', filename);

  console.log(`Attempting to download: ${filePath}`);

  res.download(filePath, (err) => {
    if (err) {
      console.error('Download error:', err.message);
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
