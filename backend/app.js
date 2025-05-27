const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// More secure CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

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

// Secure password hashing with salt
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
  return hash === testHash;
}

// Security helper functions
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function normalizeEmail(email) {
  return email.toLowerCase().trim();
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function isValidUsername(username) {
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  return usernameRegex.test(username) && username.length >= 3 && username.length <= 30;
}

function isStrongPassword(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

// Ensure downloads directory exists
const downloadsDir = path.join(__dirname, 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// HOME PAGE
app.get('/', (req, res) => {
  res.send(`
    <h1>DevSecOps Secure Application</h1>
    <p>This app has been secured against common vulnerabilities:</p>
    <ul>
      <li><strong>SQL Injection:</strong> ✅ Fixed with parameterized queries</li>
      <li><strong>XSS:</strong> ✅ Fixed with input sanitization</li>
      <li><strong>Path Traversal:</strong> ✅ Fixed with path validation</li>
      <li><strong>Weak Crypto:</strong> ✅ Fixed with strong hashing</li>
    </ul>
    <h3>API Endpoints:</h3>
    <ul>
      <li>POST /api/login - Secure login with username/password</li>
      <li>POST /api/register - Secure user registration</li>
      <li>GET /api/download/:filename - Secure file downloads</li>
    </ul>
  `);
});

// SECURE LOGIN
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const query = 'SELECT * FROM users WHERE username = ?';
  
  db.get(query, [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!verifyPassword(password, user.password)) {
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

// SECURE REGISTRATION
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Username must be 3-30 characters, alphanumeric and underscores only' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters with letters and numbers' });
  }

  const hashedPassword = hashPassword(password);
  const safeUsername = escapeHtml(username.trim());
  const safeEmail = normalizeEmail(email);

  db.run(
    'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
    [safeUsername, hashedPassword, safeEmail],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Username or email already exists' });
        }
        console.error(err.message);
        return res.status(500).json({ error: 'Registration failed' });
      }

      res.json({
        success: true,
        message: 'Registration successful! Welcome to the platform.',
        user: {
          id: this.lastID,
          username: safeUsername,
          email: safeEmail
        }
      });
    }
  );
});

// SECURE FILE DOWNLOAD - Replace the entire endpoint
app.get('/api/download/:filename', (req, res) => {
  const userInput = req.params['filename'];

  if (!userInput || userInput.trim() === '') {
    return res.status(400).json({ error: 'Filename is required' });
  }

  // Sanitize the filename to prevent path traversal
  const safeFilename = path.basename(userInput);
  
  // Only allow specific file types
  const allowedExtensions = ['.txt', '.pdf', '.jpg', '.png', '.doc'];
  const fileExtension = path.extname(safeFilename).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return res.status(400).json({ error: 'File type not allowed' });
  }

  // Build safe file path
  const downloadsDir = path.join(__dirname, 'public', 'downloads');
  const safePath = path.join(downloadsDir, safeFilename);
  
  // Double-check the path is still within downloads directory
  if (!safePath.startsWith(downloadsDir)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  // Check if file exists
  if (!fs.existsSync(safePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Serve the file
  res.download(safePath, safeFilename, (err) => {
    if (err) {
      console.error('Download error:', err.message);
      res.status(500).json({ error: 'Download failed' });
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
  console.log(`Secure app running on port ${PORT}`);
  console.log('Application secured against common vulnerabilities!');
});