import express from 'express';
import session from 'express-session';
import multer from 'multer';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { execFile } from 'child_process';
import mime from 'mime-types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');
const CHUNK_DIR = path.resolve(UPLOAD_DIR, '.chunks');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(CHUNK_DIR)) {
  fs.mkdirSync(CHUNK_DIR, { recursive: true });
}

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'", 'blob:'],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", 'data:'],
        "connect-src": ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(morgan('dev'));

// Lightweight rate limit for auth and init/complete
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

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

app.post('/login', limiter, express.json(), (req, res) => {
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

app.post('/logout', limiter, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('patscloud.sid');
    res.json({ ok: true });
  });
});

// Multer storage
function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getCollisionSafeName(directory, desiredName) {
  const parsed = path.parse(desiredName);
  const base = sanitizeFilename(parsed.name);
  const ext = parsed.ext.toLowerCase();
  let candidate = `${base}${ext}`;
  let counter = 0;
  while (fs.existsSync(path.join(directory, candidate))) {
    counter += 1;
    candidate = `${base}(${counter})${ext}`;
  }
  return candidate;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = getCollisionSafeName(UPLOAD_DIR, file.originalname);
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10GB per file
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

// Range-enabled file streaming for accelerated downloads
app.get('/file/:name', requireAuth, async (req, res) => {
  try {
    const name = path.basename(req.params.name);
    const filePath = path.join(UPLOAD_DIR, name);
    if (!filePath.startsWith(UPLOAD_DIR)) return res.status(400).json({ error: 'Invalid path' });
    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) return res.status(404).json({ error: 'Not found' });
    const fileSize = stat.size;
    const contentType = mime.lookup(name) || 'application/octet-stream';
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');

    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = 0;
      let end = fileSize - 1;
      if (m) {
        if (m[1] !== '') start = parseInt(m[1], 10);
        if (m[2] !== '') end = parseInt(m[2], 10);
      }
      if (isNaN(start) || isNaN(end) || start > end || start >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', `${chunkSize}`);
      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.setHeader('Content-Length', `${fileSize}`);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  } catch (e) {
    res.status(500).json({ error: 'stream error' });
  }
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

// Chunked upload API
function generateUploadId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

app.post('/api/upload/init', requireAuth, limiter, express.json(), async (req, res) => {
  try {
    const { filename, size, chunkSize, totalChunks } = req.body || {};
    if (!filename || !size || !chunkSize || !totalChunks) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const id = generateUploadId();
    const dir = path.join(CHUNK_DIR, id);
    await fs.promises.mkdir(dir, { recursive: true });
    const meta = { filename: sanitizeFilename(path.parse(filename).name) + path.parse(filename).ext.toLowerCase(), size: Number(size), chunkSize: Number(chunkSize), totalChunks: Number(totalChunks), createdAt: Date.now() };
    await fs.promises.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta));
    res.json({ uploadId: id });
  } catch (e) {
    res.status(500).json({ error: 'Failed to init upload' });
  }
});

app.put('/api/upload/chunk', requireAuth, express.raw({ type: () => true, limit: '5gb' }), async (req, res) => {
  try {
    const { uploadId, index } = req.query;
    if (!uploadId || typeof uploadId !== 'string') return res.status(400).json({ error: 'uploadId required' });
    const chunkIndex = Number(index);
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) return res.status(400).json({ error: 'invalid index' });
    const dir = path.join(CHUNK_DIR, uploadId);
    const metaPath = path.join(dir, 'meta.json');
    if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'upload not found' });
    if (!req.body || (Buffer.isBuffer(req.body) && req.body.length === 0)) {
      return res.status(400).json({ error: 'empty body' });
    }
    const data = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
    const chunkPath = path.join(dir, `${chunkIndex}.part`);
    await fs.promises.writeFile(chunkPath, data);
    res.json({ ok: true, index: chunkIndex, size: data.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save chunk', detail: String(e?.message || e) });
  }
});

app.post('/api/upload/complete', requireAuth, limiter, express.json(), async (req, res) => {
  try {
    const { uploadId } = req.body || {};
    if (!uploadId) return res.status(400).json({ error: 'uploadId required' });
    const dir = path.join(CHUNK_DIR, uploadId);
    const metaPath = path.join(dir, 'meta.json');
    if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'upload not found' });
    const meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
    const safeOutName = getCollisionSafeName(UPLOAD_DIR, meta.filename);
    const outPath = path.join(UPLOAD_DIR, safeOutName);

    const writeStream = fs.createWriteStream(outPath, { flags: 'w' });
    for (let i = 0; i < meta.totalChunks; i++) {
      const chunkPath = path.join(dir, `${i}.part`);
      if (!fs.existsSync(chunkPath)) {
        writeStream.close();
        await fs.promises.unlink(outPath).catch(() => {});
        return res.status(400).json({ error: `missing chunk ${i}` });
      }
      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath);
        readStream.on('error', reject);
        writeStream.on('error', reject);
        readStream.on('end', resolve);
        readStream.pipe(writeStream, { end: false });
      });
    }
    writeStream.end();
    await new Promise((r) => writeStream.on('close', r));

    // cleanup
    const files = await fs.promises.readdir(dir);
    await Promise.all(files.map((f) => fs.promises.unlink(path.join(dir, f))));
    await fs.promises.rmdir(dir);

    const stat = await fs.promises.stat(outPath);
    res.json({ ok: true, file: { name: path.basename(outPath), size: stat.size } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to complete upload' });
  }
});

app.delete('/api/upload/abort/:uploadId', requireAuth, async (req, res) => {
  try {
    const dir = path.join(CHUNK_DIR, req.params.uploadId);
    if (!fs.existsSync(dir)) return res.json({ ok: true });
    const files = await fs.promises.readdir(dir);
    await Promise.all(files.map((f) => fs.promises.unlink(path.join(dir, f))));
    await fs.promises.rmdir(dir);
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

async function getFsTotals(targetPath) {
  if (fs.promises.statfs) {
    try {
      const stats = await fs.promises.statfs(targetPath);
      const total = BigInt(stats.bsize) * BigInt(stats.blocks);
      const free = BigInt(stats.bsize) * BigInt(stats.bavail);
      return { total: Number(total), free: Number(free) };
    } catch {}
  }
  // Fallback to df
  try {
    const output = await new Promise((resolve, reject) => {
      execFile('df', ['-Pk', targetPath], (err, stdout) => {
        if (err) return reject(err);
        resolve(stdout);
      });
    });
    const lines = String(output).trim().split(/\r?\n/);
    if (lines.length >= 2) {
      const parts = lines[1].trim().split(/\s+/);
      const totalK = Number(parts[1]);
      const availK = Number(parts[3]);
      return { total: totalK * 1024, free: availK * 1024 };
    }
  } catch {}
  return { total: 0, free: 0 };
}

async function getUploadsUsedBytes() {
  const entries = await fs.promises.readdir(UPLOAD_DIR, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    if (entry.name === '.chunks') continue;
    if (entry.isFile()) {
      const stat = await fs.promises.stat(path.join(UPLOAD_DIR, entry.name));
      total += stat.size;
    }
  }
  return total;
}

app.get('/api/storage', requireAuth, async (_req, res) => {
  try {
    const [{ total, free }, usedUploads] = await Promise.all([
      getFsTotals(UPLOAD_DIR),
      getUploadsUsedBytes(),
    ]);
    res.json({ totalBytes: total, freeBytes: free, usedBytesUploads: usedUploads });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get storage info' });
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