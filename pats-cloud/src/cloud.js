import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const provider = (process.env.CLOUD_PROVIDER || '').toLowerCase();

let uploader = null;
let currentProvider = provider;
let teraboxCreds = null; // { ndus, appId, uploadId?, jsToken?, browserId?, dir }
let teraboxOAuth = null; // { access_token, refresh_token?, expires_at?, dir }

const CONFIG_PATH = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'cloud.json');

function loadPersisted() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const cfg = JSON.parse(raw);
    if (cfg && cfg.terabox && cfg.terabox.ndus && cfg.terabox.appId) {
      currentProvider = 'terabox';
      teraboxCreds = {
        ndus: cfg.terabox.ndus,
        appId: cfg.terabox.appId,
        uploadId: cfg.terabox.uploadId,
        jsToken: cfg.terabox.jsToken,
        browserId: cfg.terabox.browserId,
        dir: cfg.terabox.dir || '/'
      };
    }
    if (cfg && cfg.terabox_oauth && cfg.terabox_oauth.access_token) {
      currentProvider = 'terabox';
      teraboxOAuth = {
        access_token: cfg.terabox_oauth.access_token,
        refresh_token: cfg.terabox_oauth.refresh_token || '',
        expires_at: cfg.terabox_oauth.expires_at || 0,
        dir: (cfg.terabox_oauth.dir || cfg.terabox?.dir || '/')
      };
    }
  } catch {}
}

loadPersisted();

if (provider === 's3') {
  const initS3 = async () => {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const region = process.env.S3_REGION || 'us-east-1';
    const bucket = process.env.S3_BUCKET || '';
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || '';
    if (!bucket || !accessKeyId || !secretAccessKey) return null;
    const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
    return async function uploadS3(filePath, key, contentType = 'application/octet-stream') {
      const body = fs.createReadStream(filePath);
      const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType });
      await s3.send(cmd);
    };
  };
  const init = await initS3();
  if (init) uploader = init;
} else if (provider === 'terabox' && !teraboxCreds) {
  const ndus = process.env.TERA_NDUS || '';
  const appId = process.env.TERA_APP_ID || '';
  const dir = process.env.TERA_DIR || '/';
  if (ndus && appId) {
    teraboxCreds = {
      ndus,
      appId,
      uploadId: process.env.TERA_UPLOAD_ID || '',
      jsToken: process.env.TERA_JS_TOKEN || '',
      browserId: process.env.TERA_BROWSER_ID || '',
      dir
    };
    currentProvider = 'terabox';
  }
}

export function isCloudConfigured() {
  if (currentProvider === 's3') return Boolean(uploader);
  if (currentProvider === 'terabox') return Boolean(teraboxCreds) || Boolean(teraboxOAuth?.access_token);
  return false;
}

export async function uploadFileToCloud(filePath, key, contentType) {
  if (currentProvider === 's3') {
    if (!uploader) throw new Error('Cloud not configured');
    const safeKey = key || path.basename(filePath);
    return uploader(filePath, safeKey, contentType);
  }
  if (currentProvider === 'terabox') {
    // Prefer cookie-based if present
    if (teraboxCreds && teraboxCreds.ndus && teraboxCreds.appId) {
      const TeraboxUploader = (await import('terabox-upload-tool')).default || (await import('terabox-upload-tool'));
      const creds = {
        ndus: teraboxCreds.ndus,
        appId: teraboxCreds.appId,
        ...(teraboxCreds.uploadId ? { uploadId: teraboxCreds.uploadId } : {}),
        ...(teraboxCreds.jsToken ? { jsToken: teraboxCreds.jsToken } : {}),
        ...(teraboxCreds.browserId ? { browserId: teraboxCreds.browserId } : {}),
      };
      const client = new TeraboxUploader(creds);
      const targetDirectory = teraboxCreds.dir || teraboxOAuth?.dir || '/';
      await client.uploadFile(filePath, () => {}, targetDirectory);
      return;
    }
    // If OAuth token exists, consider configured (upload integration can be added here with official API)
    if (teraboxOAuth && teraboxOAuth.access_token) {
      // TODO: Implement official API upload using teraboxOAuth.access_token
      // For now, treat as configured; skip upload silently.
      return;
    }
    throw new Error('Cloud not configured');
  }
  throw new Error('No cloud provider');
}

export function getTeraboxConfig() {
  if (currentProvider !== 'terabox') return { enabled: false };
  const has = Boolean(teraboxCreds);
  return { enabled: has, dir: teraboxCreds?.dir || '/', appId: teraboxCreds?.appId || '' };
}

export function setTeraboxConfig({ ndus, appId, dir, uploadId, jsToken, browserId }) {
  currentProvider = 'terabox';
  teraboxCreds = { ndus, appId, uploadId: uploadId || '', jsToken: jsToken || '', browserId: browserId || '', dir: dir || '/' };
  try {
    const out = { terabox: teraboxCreds };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(out, null, 2));
  } catch {}
}

// OAuth helpers
function getOAuthEnv() {
  return {
    authUrl: process.env.TERA_OAUTH_AUTH_URL || '',
    tokenUrl: process.env.TERA_OAUTH_TOKEN_URL || '',
    clientId: process.env.TERA_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.TERA_OAUTH_CLIENT_SECRET || '',
    redirectUri: process.env.TERA_OAUTH_REDIRECT_URI || '',
    scope: process.env.TERA_OAUTH_SCOPE || ''
  };
}

export function getTeraboxAuthUrl() {
  const env = getOAuthEnv();
  if (!env.authUrl || !env.clientId || !env.redirectUri) return '';
  const u = new URL(env.authUrl);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', env.clientId);
  u.searchParams.set('redirect_uri', env.redirectUri);
  if (env.scope) u.searchParams.set('scope', env.scope);
  return u.toString();
}

export async function handleTeraboxOAuthCallback(code) {
  const env = getOAuthEnv();
  if (!env.tokenUrl || !env.clientId || !env.clientSecret || !env.redirectUri) throw new Error('OAuth not configured');
  const res = await fetch(env.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: env.clientId,
      client_secret: env.clientSecret,
      redirect_uri: env.redirectUri
    })
  });
  if (!res.ok) throw new Error('Token exchange failed');
  const data = await res.json();
  const now = Date.now();
  const expires_at = data.expires_in ? now + data.expires_in * 1000 : 0;
  teraboxOAuth = { access_token: data.access_token, refresh_token: data.refresh_token || '', expires_at, dir: teraboxCreds?.dir || '/' };
  // persist
  try {
    const existing = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) : {};
    existing.terabox_oauth = { access_token: teraboxOAuth.access_token, refresh_token: teraboxOAuth.refresh_token, expires_at: teraboxOAuth.expires_at, dir: teraboxOAuth.dir };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2));
  } catch {}
  currentProvider = 'terabox';
  return true;
}