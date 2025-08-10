import express from 'express';
import session from 'express-session';
import multer from 'multer';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", 'data:'],
        "connect-src": ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Sessions
const sessionSecret = process.env.SESSION_SECRET || 'dev_secret_change_me';
app.use(
  session({
    name: 'patscloud.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // set true if behind HTTPS/Proxy with trust proxy
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Simple password-based auth
const appPassword = process.env.APP_PASSWORD || '';

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.post('/login', (req, res) => {
  const { password } = req.body;
  if (!appPassword) {
    // If no password configured, allow login by default but warn
    req.session.authenticated = true;
    return res.json({ ok: true, warning: 'No APP_PASSWORD set. Please configure .env' });
  }
  if (password && password === appPassword) {
    req.session.authenticated = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('patscloud.sid');
    res.json({ ok: true });
  });
});

// Multer storage
function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const base = path.parse(file.originalname).name;
    const ext = path.parse(file.originalname).ext;
    const safe = sanitizeFilename(base) + ext.toLowerCase();
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB per file
  },
});

// API routes
app.get('/api/files', requireAuth, async (_req, res) => {
  try {
    const entries = await fs.promises.readdir(UPLOAD_DIR, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((d) => d.isFile())
        .map(async (d) => {
          const filePath = path.join(UPLOAD_DIR, d.name);
          const stat = await fs.promises.stat(filePath);
          return {
            name: d.name,
            size: stat.size,
            modifiedAt: stat.mtimeMs,
          };
        })
    );
    files.sort((a, b) => b.modifiedAt - a.modifiedAt);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.post('/api/upload', requireAuth, upload.array('files', 20), (req, res) => {
  const uploaded = (req.files || []).map((f) => ({ name: path.basename(f.filename), size: f.size }));
  res.json({ ok: true, uploaded });
});

app.get('/download/:name', requireAuth, async (req, res) => {
  const name = path.basename(req.params.name);
  const filePath = path.join(UPLOAD_DIR, name);
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.download(filePath, name);
});

app.delete('/api/files/:name', requireAuth, async (req, res) => {
  const name = path.basename(req.params.name);
  const filePath = path.join(UPLOAD_DIR, name);
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  try {
    await fs.promises.unlink(filePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: 'Not found' });
  }
});

// Static frontend
app.use(express.static(path.resolve(__dirname, '..', 'public')));

// Fallback to index.html for non-API routes
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Pats Cloud running on http://localhost:${PORT}`);
});