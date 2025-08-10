import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const provider = (process.env.CLOUD_PROVIDER || '').toLowerCase();

let uploader = null;

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
  uploader = await initS3();
} else if (provider === 'terabox') {
  try {
    // Lazy require to avoid install cost when unused
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const TeraboxUploader = (await import('terabox-upload-tool')).default || (await import('terabox-upload-tool'));
    const ndus = process.env.TERA_NDUS || '';
    const appId = process.env.TERA_APP_ID || '';
    const uploadId = process.env.TERA_UPLOAD_ID || '';
    const defaultDir = process.env.TERA_DIR || '/';
    if (ndus && appId && uploadId) {
      uploader = async function uploadTerabox(filePath, key, _contentType = 'application/octet-stream') {
        const creds = { ndus, appId, uploadId };
        const client = new TeraboxUploader(creds);
        const targetDirectory = defaultDir;
        await new Promise((resolve, reject) => {
          client.uploadFile(filePath, () => {}, targetDirectory)
            .then(resolve)
            .catch(reject);
        });
      };
    }
  } catch {
    uploader = null;
  }
}

export function isCloudConfigured() {
  return Boolean(uploader);
}

export async function uploadFileToCloud(filePath, key, contentType) {
  if (!uploader) throw new Error('Cloud not configured');
  // key may be ignored by some providers (e.g., TeraBox)
  const safeKey = key || path.basename(filePath);
  return uploader(filePath, safeKey, contentType);
}