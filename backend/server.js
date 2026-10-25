const express = require('express');
const cors = require('cors');
const path = require('path');
const { DatabaseSync } = require('node:sqlite'); // built into Node 22.13+, no install or compiling needed

const PORT = process.env.PORT || 5000;
const CATEGORIES = ['Technology', 'Business', 'Design', 'Workshop'];
const STATUSES = ['Upcoming', 'Ongoing', 'Completed'];

// ---------- Database ----------
const db = new DatabaseSync(path.join(__dirname, 'events.db'));
db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  venue TEXT NOT NULL,
  image TEXT DEFAULT '',
  capacity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Upcoming'
);
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, email)
);`);

// Seed sample data on first run
if (db.prepare('SELECT COUNT(*) c FROM events').get().c === 0) {
  const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const img = (s) => `https://picsum.photos/seed/${s}/640/400`;
  const ins = db.prepare(`INSERT INTO events (title,category,description,date,time,venue,image,capacity,status)
    VALUES (@title,@category,@description,@date,@time,@venue,@image,@capacity,@status)`);
  [
    ['React Performance Clinic', 'Technology', 'Profile real apps and fix slow renders with hands-on exercises.', day(5), '10:00', 'Hall A, Hinjewadi Tech Park, Pune', img('react'), 40, 'Upcoming'],
    ['Startup Pitch Night', 'Business', 'Ten founders pitch to a panel of local investors. Networking follows.', day(9), '18:30', 'Startup Hub, Koregaon Park, Pune', img('pitch'), 80, 'Upcoming'],
    ['Figma to Production', 'Design', 'Turn a design file into a handoff-ready component library.', day(12), '14:00', 'Studio 3, Baner, Pune', img('figma'), 25, 'Upcoming'],
    ['REST API Workshop', 'Workshop', 'Build and test a Node.js REST API from scratch, one endpoint at a time.', day(3), '09:30', 'Lab 2, Portalwiz Office, Pune', img('api'), 3, 'Upcoming'],
    ['Cloud Security Basics', 'Technology', 'IAM, secrets, and network rules explained with live demos.', day(0), '11:00', 'Online (link sent after registration)', img('cloud'), 100, 'Ongoing'],
    ['Product Strategy Roundtable', 'Business', 'Discuss roadmaps and prioritisation with product leads.', day(-10), '16:00', 'Conference Room 1, Viman Nagar, Pune', img('strategy'), 30, 'Completed'],
    ['UX Research Sprint', 'Design', 'Plan, run, and summarise five user interviews in one afternoon.', day(-20), '13:00', 'Studio 1, Baner, Pune', img('ux'), 20, 'Completed'],
    ['Git & GitHub for Teams', 'Workshop', 'Branching, pull requests, and resolving merge conflicts together.', day(16), '10:30', 'Lab 1, Portalwiz Office, Pune', img('git'), 35, 'Upcoming'],
  ].forEach(([title, category, description, date, time, venue, image, capacity, status]) =>
    ins.run({ title, category, description, date, time, venue, image, capacity, status }));
}

// ---------- Helpers ----------
const BASE = `SELECT e.*, (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registered FROM events e`;
const withSeats = (e) => e && { ...e, availableSeats: e.capacity - e.registered };
const getEvent = (id) => withSeats(db.prepare(`${BASE} WHERE e.id = ?`).get(id));
const str = (v) => String(v ?? '').trim();

function validateEvent(b) {
  const errors = {};
  if (str(b.title).length < 3) errors.title = 'Title must be at least 3 characters.';
  if (!CATEGORIES.includes(b.category)) errors.category = 'Choose a valid category.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str(b.date))) errors.date = 'Enter a valid date.';
  if (!/^\d{2}:\d{2}$/.test(str(b.time))) errors.time = 'Enter a valid time.';
  if (str(b.venue).length < 2) errors.venue = 'Venue is required.';
  if (!Number.isInteger(Number(b.capacity)) || Number(b.capacity) < 1) errors.capacity = 'Capacity must be a whole number of 1 or more.';
  if (b.status && !STATUSES.includes(b.status)) errors.status = 'Invalid status.';
  return errors;
}

function validateRegistration(b) {
  const errors = {};
  if (str(b.name).length < 2) errors.name = 'Enter your full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str(b.email))) errors.email = 'Enter a valid email address.';
  const digits = str(b.phone).replace(/[\s()-]/g, '').replace(/^\+/, '');
  if (!/^\d{10,13}$/.test(digits)) errors.phone = 'Enter a valid contact number (10 to 13 digits).';
  return errors;
}

// ---------- App ----------
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/events', (req, res) => {
  const { search = '', category = '', sort = 'asc' } = req.query;
  const dir = sort === 'desc' ? 'DESC' : 'ASC';
  const rows = db
    .prepare(`${BASE} WHERE e.title LIKE ? AND (? = '' OR e.category = ?) ORDER BY e.date ${dir}, e.time ${dir}`)
    .all(`%${str(search)}%`, str(category), str(category));
  res.json(rows.map(withSeats));
});

app.get('/api/events/:id', (req, res) => {
  const ev = getEvent(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Event not found.' });
  res.json(ev);
});

app.post('/api/events', (req, res) => {
  const errors = validateEvent(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', errors });
  const b = req.body;
  const info = db
    .prepare(`INSERT INTO events (title,category,description,date,time,venue,image,capacity,status) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(str(b.title), b.category, str(b.description), str(b.date), str(b.time), str(b.venue), str(b.image), Number(b.capacity), b.status || 'Upcoming');
  res.status(201).json(getEvent(info.lastInsertRowid));
});

app.put('/api/events/:id', (req, res) => {
  const ev = getEvent(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Event not found.' });
  const errors = validateEvent(req.body);
  if (!errors.capacity && Number(req.body.capacity) < ev.registered)
    errors.capacity = `Capacity cannot be below the ${ev.registered} existing registrations.`;
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', errors });
  const b = req.body;
  db.prepare(`UPDATE events SET title=?,category=?,description=?,date=?,time=?,venue=?,image=?,capacity=?,status=? WHERE id=?`)
    .run(str(b.title), b.category, str(b.description), str(b.date), str(b.time), str(b.venue), str(b.image), Number(b.capacity), b.status || ev.status, ev.id);
  res.json(getEvent(ev.id));
});

app.patch('/api/events/:id/status', (req, res) => {
  if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status.' });
  const info = db.prepare('UPDATE events SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Event not found.' });
  res.json(getEvent(req.params.id));
});

app.delete('/api/events/:id', (req, res) => {
  const info = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Event not found.' });
  res.json({ ok: true });
});

app.get('/api/events/:id/registrations', (req, res) => {
  res.json(db.prepare('SELECT id,name,email,phone,created_at FROM registrations WHERE event_id = ? ORDER BY id DESC').all(req.params.id));
});

app.post('/api/events/:id/register', (req, res) => {
  const ev = getEvent(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Event not found.' });
  const errors = validateRegistration(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', errors });
  if (ev.status === 'Completed') return res.status(400).json({ error: 'This event has finished, so registration is closed.' });
  if (ev.availableSeats <= 0) return res.status(409).json({ error: 'Sorry, this event is full.' });
  try {
    db.prepare('INSERT INTO registrations (event_id,name,email,phone) VALUES (?,?,?,?)')
      .run(ev.id, str(req.body.name), str(req.body.email).toLowerCase(), str(req.body.phone));
  } catch (e) {
    if (/UNIQUE constraint failed/i.test(String(e.message)))
      return res.status(409).json({ error: 'This email is already registered for this event.', errors: { email: 'Already registered for this event.' } });
    throw e;
  }
  res.status(201).json({ message: `You're registered for ${ev.title}.`, event: getEvent(ev.id) });
});

app.get('/api/stats', (_req, res) => {
  const count = (status) => db.prepare('SELECT COUNT(*) c FROM events WHERE status = ?').get(status).c;
  res.json({
    totalEvents: db.prepare('SELECT COUNT(*) c FROM events').get().c,
    upcomingEvents: count('Upcoming'),
    completedEvents: count('Completed'),
    totalRegistrations: db.prepare('SELECT COUNT(*) c FROM registrations').get().c,
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`));
