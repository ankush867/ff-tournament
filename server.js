const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'public/uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Database
const dbPath = process.env.DB_PATH || path.join(__dirname, 'tournament.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password TEXT NOT NULL,
    ff_uid TEXT DEFAULT '',
    wallet REAL DEFAULT 0,
    is_suspended INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    game_mode TEXT DEFAULT 'Battle Royale',
    map_name TEXT DEFAULT 'Bermuda',
    entry_fee REAL DEFAULT 0,
    prize_pool REAL DEFAULT 0,
    max_players INTEGER DEFAULT 48,
    current_players INTEGER DEFAULT 0,
    match_time DATETIME NOT NULL,
    room_id TEXT DEFAULT '',
    room_password TEXT DEFAULT '',
    status TEXT DEFAULT 'upcoming',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS match_registrations (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    match_id TEXT NOT NULL,
    registration_id TEXT NOT NULL,
    amount REAL NOT NULL,
    utr_number TEXT NOT NULL,
    screenshot TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rank INTEGER NOT NULL,
    kills INTEGER DEFAULT 0,
    prize REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS admin (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`);

// Create default admin
const adminExists = db.prepare('SELECT id FROM admin LIMIT 1').get();
if (!adminExists) {
  const hashedPw = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admin (id, username, password) VALUES (?, ?, ?)').run(uuidv4(), 'admin', hashedPw);
}

// UPI Config
const UPI_ID = '7762067909@ibl';
const SUPPORT_EMAIL = 'vt158376@gmail.com';

// ============ AUTH ROUTES ============

app.post('/api/register', (req, res) => {
  try {
    const { username, email, phone, password, ff_uid } = req.body;
    if (!username || !password || (!email && !phone)) {
      return res.status(400).json({ error: 'Username, password, and email or phone required' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ? OR phone = ?').get(username, email || '', phone || '');
    if (existing) return res.status(400).json({ error: 'User already exists with this username, email, or phone' });
    
    const hashedPw = bcrypt.hashSync(password, 10);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, username, email, phone, password, ff_uid) VALUES (?, ?, ?, ?, ?, ?)').run(id, username, email || '', phone || '', hashedPw, ff_uid || '');
    res.json({ success: true, user: { id, username, email, phone, ff_uid } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ error: 'Login and password required' });
    
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ? OR phone = ?').get(login, login, login);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.is_suspended) return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
    
    res.json({ success: true, user: { id: user.id, username: user.username, email: user.email, phone: user.phone, ff_uid: user.ff_uid, wallet: user.wallet } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ MATCH ROUTES ============

app.get('/api/matches', (req, res) => {
  try {
    const matches = db.prepare('SELECT * FROM matches ORDER BY match_time ASC').all();
    res.json(matches);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/matches/:id', (req, res) => {
  try {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/matches/:id/join', (req, res) => {
  try {
    const { user_id } = req.body;
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    if (match.current_players >= match.max_players) return res.status(400).json({ error: 'Match is full' });
    
    const existing = db.prepare('SELECT id FROM match_registrations WHERE match_id = ? AND user_id = ?').get(req.params.id, user_id);
    if (existing) return res.status(400).json({ error: 'Already registered', registration_id: existing.id });
    
    const regId = uuidv4();
    db.prepare('INSERT INTO match_registrations (id, match_id, user_id) VALUES (?, ?, ?)').run(regId, req.params.id, user_id);
    db.prepare('UPDATE matches SET current_players = current_players + 1 WHERE id = ?').run(req.params.id);
    
    res.json({ success: true, registration_id: regId, entry_fee: match.entry_fee });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/matches/:id/room', (req, res) => {
  try {
    const { user_id } = req.query;
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    
    const payment = db.prepare('SELECT * FROM payments WHERE match_id = ? AND user_id = ? AND status = ?').get(req.params.id, user_id, 'approved');
    
    if (!payment && match.entry_fee > 0) {
      return res.status(403).json({ error: 'Payment not approved yet. Room details will be visible after admin approves your payment.' });
    }
    
    res.json({ room_id: match.room_id, room_password: match.room_password });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/matches/:id/registrations', (req, res) => {
  try {
    const regs = db.prepare(`
      SELECT mr.*, u.username, u.ff_uid, p.status as payment_status_detail 
      FROM match_registrations mr 
      JOIN users u ON mr.user_id = u.id 
      LEFT JOIN payments p ON p.registration_id = mr.id
      WHERE mr.match_id = ?
    `).all(req.params.id);
    res.json(regs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user/:userId/registrations', (req, res) => {
  try {
    const regs = db.prepare(`
      SELECT mr.*, m.title, m.match_time, m.status as match_status, m.entry_fee, 
             p.status as payment_status, p.id as payment_id
      FROM match_registrations mr
      JOIN matches m ON mr.match_id = m.id
      LEFT JOIN payments p ON p.registration_id = mr.id
      WHERE mr.user_id = ?
      ORDER BY m.match_time DESC
    `).all(req.params.userId);
    res.json(regs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ PAYMENT ROUTES ============

app.get('/api/upi-qr', async (req, res) => {
  try {
    const amount = req.query.amount || '';
    let upiUrl = `upi://pay?pa=${UPI_ID}&pn=FFTournament`;
    if (amount) upiUrl += `&am=${amount}`;
    const qr = await QRCode.toDataURL(upiUrl);
    res.json({ qr, upi_id: UPI_ID });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/payments', upload.single('screenshot'), (req, res) => {
  try {
    const { user_id, match_id, registration_id, amount, utr_number } = req.body;
    const screenshot = req.file ? '/uploads/' + req.file.filename : '';
    
    if (!user_id || !match_id || !registration_id || !amount || !utr_number) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    const existingPayment = db.prepare('SELECT id FROM payments WHERE registration_id = ?').get(registration_id);
    if (existingPayment) return res.status(400).json({ error: 'Payment already submitted for this registration' });
    
    const id = uuidv4();
    db.prepare('INSERT INTO payments (id, user_id, match_id, registration_id, amount, utr_number, screenshot) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, user_id, match_id, registration_id, parseFloat(amount), utr_number, screenshot);
    db.prepare('UPDATE match_registrations SET payment_status = ? WHERE id = ?').run('submitted', registration_id);
    
    res.json({ success: true, payment_id: id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ RESULTS ROUTES ============

app.get('/api/matches/:id/results', (req, res) => {
  try {
    const results = db.prepare(`
      SELECT r.*, u.username, u.ff_uid 
      FROM results r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.match_id = ? 
      ORDER BY r.rank ASC
    `).all(req.params.id);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ ADMIN ROUTES ============

app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    res.json({ success: true, admin: { id: admin.id, username: admin.username } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/matches', (req, res) => {
  try {
    const { title, game_mode, map_name, entry_fee, prize_pool, max_players, match_time, room_id, room_password } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO matches (id, title, game_mode, map_name, entry_fee, prize_pool, max_players, match_time, room_id, room_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, title, game_mode || 'Battle Royale', map_name || 'Bermuda', parseFloat(entry_fee) || 0, parseFloat(prize_pool) || 0, parseInt(max_players) || 48, match_time, room_id || '', room_password || '');
    res.json({ success: true, match_id: id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/matches/:id', (req, res) => {
  try {
    const { title, game_mode, map_name, entry_fee, prize_pool, max_players, match_time, room_id, room_password, status } = req.body;
    db.prepare('UPDATE matches SET title=?, game_mode=?, map_name=?, entry_fee=?, prize_pool=?, max_players=?, match_time=?, room_id=?, room_password=?, status=? WHERE id=?').run(title, game_mode, map_name, parseFloat(entry_fee), parseFloat(prize_pool), parseInt(max_players), match_time, room_id || '', room_password || '', status, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/matches/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/payments', (req, res) => {
  try {
    const payments = db.prepare(`
      SELECT p.*, u.username, u.ff_uid, m.title as match_title 
      FROM payments p 
      JOIN users u ON p.user_id = u.id 
      JOIN matches m ON p.match_id = m.id 
      ORDER BY p.created_at DESC
    `).all();
    res.json(payments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/payments/:id', (req, res) => {
  try {
    const { status } = req.body;
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    db.prepare('UPDATE payments SET status = ? WHERE id = ?').run(status, req.params.id);
    db.prepare('UPDATE match_registrations SET payment_status = ? WHERE id = ?').run(status, payment.registration_id);
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, email, phone, ff_uid, wallet, is_suspended, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/users/:id/suspend', (req, res) => {
  try {
    const { suspend } = req.body;
    db.prepare('UPDATE users SET is_suspended = ? WHERE id = ?').run(suspend ? 1 : 0, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/results', (req, res) => {
  try {
    const { match_id, results } = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO results (id, match_id, user_id, rank, kills, prize) VALUES (?, ?, ?, ?, ?, ?)');
    const insertMany = db.transaction((results) => {
      for (const r of results) {
        stmt.run(uuidv4(), match_id, r.user_id, r.rank, r.kills || 0, r.prize || 0);
      }
    });
    insertMany(results);
    db.prepare('UPDATE matches SET status = ? WHERE id = ?').run('completed', match_id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/config', (req, res) => {
  res.json({ upi_id: UPI_ID, support_email: SUPPORT_EMAIL });
});

// Setup script - creates public folder structure on first run
function setupFolders() {
  const dirs = ['public', 'public/css', 'public/js', 'public/uploads', 'public/icons'];
  dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });
  
  // Move files to correct locations if they exist in root
  const moves = {
    'style.css': 'public/css/style.css',
    'app.js': 'public/js/app.js',
    'index.html': 'public/index.html',
    'manifest.json': 'public/manifest.json',
    'sw.js': 'public/sw.js',
    'icon-192.png': 'public/icons/icon-192.png',
    'icon-192.svg': 'public/icons/icon-192.svg',
    'icon-512.png': 'public/icons/icon-512.png',
    'icon-512.svg': 'public/icons/icon-512.svg',
  };
  
  for (const [from, to] of Object.entries(moves)) {
    const fromPath = path.join(__dirname, from);
    const toPath = path.join(__dirname, to);
    if (fs.existsSync(fromPath) && !fs.existsSync(toPath)) {
      fs.copyFileSync(fromPath, toPath);
      console.log(`Moved ${from} -> ${to}`);
    }
  }
}

setupFolders();

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FF Tournament server running on port ${PORT}`);
});

module.exports = app;
