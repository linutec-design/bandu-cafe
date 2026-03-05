const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// ── Config ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "104coffee";
const STAMPS_NEEDED = 10;

// ── DB ────────────────────────────────────────────────
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "cafe.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    name      TEXT PRIMARY KEY,
    stamps    INTEGER DEFAULT 0,
    pending   INTEGER DEFAULT 0,
    redeemed  INTEGER DEFAULT 0,
    pending_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS activity_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT,
    action    TEXT,
    at        TEXT DEFAULT (datetime('now'))
  );
`);

// ── Helpers ───────────────────────────────────────────
function getUser(name) {
    let u = db.prepare("SELECT * FROM users WHERE name = ?").get(name);
    if (!u) {
        db.prepare("INSERT INTO users (name) VALUES (?)").run(name);
        u = db.prepare("SELECT * FROM users WHERE name = ?").get(name);
    }
    return u;
}

function logAction(name, action) {
    db.prepare("INSERT INTO activity_log (user_name, action) VALUES (?, ?)").run(name, action);
}

function adminAuth(req, res) {
    if (req.headers["x-admin-pw"] !== OWNER_PASSWORD) {
        res.status(401).json({ error: "Unauthorized" });
        return false;
    }
    return true;
}

// ── App ───────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// QR 전체화면 페이지
app.get("/qr", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "qr.html"));
});

// ── USER Routes ───────────────────────────────────────

// POST /api/login
app.post("/api/login", (req, res) => {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Name required" });
    const user = getUser(name);
    res.json({ ok: true, user });
});

// GET /api/user/:name  (polling)
app.get("/api/user/:name", (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const user = db.prepare("SELECT * FROM users WHERE name = ?").get(name);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
});

// POST /api/stamp-request
app.post("/api/stamp-request", (req, res) => {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Name required" });
    const user = getUser(name);
    if (user.pending) return res.status(409).json({ error: "Already pending" });
    if (user.stamps >= STAMPS_NEEDED) return res.status(400).json({ error: "Already full" });

    db.prepare("UPDATE users SET pending = 1, pending_at = datetime('now') WHERE name = ?").run(name);
    logAction(name, "stamp_request");
    res.json({ ok: true });
});

// POST /api/claim-reward
app.post("/api/claim-reward", (req, res) => {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Name required" });
    const user = db.prepare("SELECT * FROM users WHERE name = ?").get(name);
    if (!user || user.stamps < STAMPS_NEEDED) return res.status(400).json({ error: "Not enough stamps" });

    db.prepare("UPDATE users SET stamps = 0, pending = 0, redeemed = redeemed + 1 WHERE name = ?").run(name);
    logAction(name, "claim_reward");
    res.json({ ok: true });
});

// ── ADMIN Routes ──────────────────────────────────────

// POST /api/admin/login
app.post("/api/admin/login", (req, res) => {
    if (req.body.password === OWNER_PASSWORD) res.json({ ok: true });
    else res.status(401).json({ error: "Wrong password" });
});

// GET /api/admin/dashboard
app.get("/api/admin/dashboard", (req, res) => {
    if (!adminAuth(req, res)) return;
    const users = db.prepare("SELECT * FROM users ORDER BY stamps DESC, name ASC").all();
    const requests = db.prepare("SELECT * FROM users WHERE pending = 1 ORDER BY pending_at ASC").all();
    const fullCount = users.filter((u) => u.stamps >= STAMPS_NEEDED).length;
    res.json({ users, requests, fullCount, stampsNeeded: STAMPS_NEEDED });
});

// POST /api/admin/approve
app.post("/api/admin/approve", (req, res) => {
    if (!adminAuth(req, res)) return;
    const name = (req.body.name || "").trim();
    db.prepare("UPDATE users SET stamps = stamps + 1, pending = 0, pending_at = NULL WHERE name = ?").run(name);
    logAction(name, "admin_approve");
    res.json({ ok: true });
});

// POST /api/admin/deny
app.post("/api/admin/deny", (req, res) => {
    if (!adminAuth(req, res)) return;
    const name = (req.body.name || "").trim();
    db.prepare("UPDATE users SET pending = 0, pending_at = NULL WHERE name = ?").run(name);
    logAction(name, "admin_deny");
    res.json({ ok: true });
});

// POST /api/admin/add-stamp
app.post("/api/admin/add-stamp", (req, res) => {
    if (!adminAuth(req, res)) return;
    const name = (req.body.name || "").trim();
    const user = db.prepare("SELECT * FROM users WHERE name = ?").get(name);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.stamps >= STAMPS_NEEDED) return res.status(400).json({ error: "Already full" });
    db.prepare("UPDATE users SET stamps = stamps + 1 WHERE name = ?").run(name);
    logAction(name, "admin_add_stamp");
    res.json({ ok: true });
});

// POST /api/admin/reset
app.post("/api/admin/reset", (req, res) => {
    if (!adminAuth(req, res)) return;
    const name = (req.body.name || "").trim();
    db.prepare("UPDATE users SET stamps = 0, pending = 0, pending_at = NULL WHERE name = ?").run(name);
    logAction(name, "admin_reset");
    res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`☕ Bandu Cafe Stamp Server running on port ${PORT}`);
});
