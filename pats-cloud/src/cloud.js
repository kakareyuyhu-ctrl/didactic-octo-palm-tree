import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const provider = (process.env.CLOUD_PROVIDER || '').toLowerCase();

let uploader = null;
let currentProvider = provider;
let teraboxCreds = null; // { ndus, appId, uploadId?, dir }

const CONFIG_PATH = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'cloud.json');

function loadPersisted() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const cfg = JSON.parse(raw);
    if (cfg && cfg.terabox && cfg.terabox.ndus && cfg.terabox.appId) {
      currentProvider = 'terabox';
      teraboxCreds = { ndus: cfg.terabox.ndus, appId: cfg.terabox.appId, uploadId: cfg.terabox.uploadId, dir: cfg.terabox.dir || '/' };
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
    teraboxCreds = { ndus, appId, uploadId: process.env.TERA_UPLOAD_ID || '', dir };
    currentProvider = 'terabox';
  }
}

export function isCloudConfigured() {
  if (currentProvider === 's3') return Boolean(uploader);
  if (currentProvider === 'terabox') return Boolean(teraboxCreds);
  return false;
}

export async function uploadFileToCloud(filePath, key, contentType) {
  if (currentProvider === 's3') {
    if (!uploader) throw new Error('Cloud not configured');
    const safeKey = key || path.basename(filePath);
    return uploader(filePath, safeKey, contentType);
  }
  if (currentProvider === 'terabox') {
    if (!teraboxCreds) throw new Error('Cloud not configured');
    const TeraboxUploader = (await import('terabox-upload-tool')).default || (await import('terabox-upload-tool'));
    const creds = teraboxCreds.uploadId
      ? { ndus: teraboxCreds.ndus, appId: teraboxCreds.appId, uploadId: teraboxCreds.uploadId }
      : { ndus: teraboxCreds.ndus, appId: teraboxCreds.appId };
    const client = new TeraboxUploader(creds);
    const targetDirectory = teraboxCreds.dir || '/';
    await client.uploadFile(filePath, () => {}, targetDirectory);
    return;
  }
  throw new Error('No cloud provider');
}

export function getTeraboxConfig() {
  if (currentProvider !== 'terabox') return { enabled: false };
  const has = Boolean(teraboxCreds);
  return { enabled: has, dir: teraboxCreds?.dir || '/', appId: teraboxCreds?.appId || '' };
}

export function setTeraboxConfig({ ndus, appId, dir, uploadId }) {
  currentProvider = 'terabox';
  teraboxCreds = { ndus, appId, uploadId: uploadId || '', dir: dir || '/' };
  try {
    const out = { terabox: teraboxCreds };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(out, null, 2));
  } catch {}
}