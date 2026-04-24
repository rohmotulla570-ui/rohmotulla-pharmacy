const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database('pharmacy.db');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
db.exec(`
  CREATE TABLE IF NOT EXISTS medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    generic TEXT NOT NULL,
    category TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    unit_price REAL NOT NULL,
    bulk_price REAL,
    stock INTEGER DEFAULT 0,
    requires_rx INTEGER DEFAULT 0,
    description TEXT,
    side_effects TEXT,
    storage TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// GET all medicines
app.get('/api/medicines', (req, res) => {
  const { q, category } = req.query;
  let sql = 'SELECT * FROM medicines WHERE 1=1';
  const params = [];
  if (q) {
    sql += ' AND (brand LIKE ? OR generic LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category && category !== 'All') {
    sql += ' AND category = ?';
    params.push(category);
  }
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// GET single medicine
app.get('/api/medicines/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// POST add medicine
app.post('/api/medicines', (req, res) => {
  const { brand, generic, category, manufacturer, unit_price, bulk_price, stock, requires_rx, description, side_effects, storage } = req.body;
  const result = db.prepare(`
    INSERT INTO medicines (brand, generic, category, manufacturer, unit_price, bulk_price, stock, requires_rx, description, side_effects, storage)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(brand, generic, category, manufacturer, unit_price, bulk_price || unit_price, stock || 0, requires_rx ? 1 : 0, description, side_effects, storage);
  res.json({ id: result.lastInsertRowid, message: 'Medicine added!' });
});

// PUT update medicine
app.put('/api/medicines/:id', (req, res) => {
  const { brand, generic, category, manufacturer, unit_price, bulk_price, stock, requires_rx, description, side_effects, storage } = req.body;
  db.prepare(`
    UPDATE medicines SET brand=?, generic=?, category=?, manufacturer=?, unit_price=?, bulk_price=?, stock=?, requires_rx=?, description=?, side_effects=?, storage=?
    WHERE id=?
  `).run(brand, generic, category, manufacturer, unit_price, bulk_price, stock, requires_rx ? 1 : 0, description, side_effects, storage, req.params.id);
  res.json({ message: 'Updated!' });
});

// DELETE medicine
app.delete('/api/medicines/:id', (req, res) => {
  db.prepare('DELETE FROM medicines WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted!' });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
