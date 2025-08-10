import dotenv from 'dotenv';
dotenv.config();

const provider = (process.env.CLOUD_PROVIDER || '').toLowerCase();

let uploader = null;

if (provider === 's3') {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const region = process.env.S3_REGION || 'us-east-1';
  const bucket = process.env.S3_BUCKET || '';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || '';
  if (bucket && accessKeyId && secretAccessKey) {
    const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
    uploader = async function uploadS3(readStream, key, contentType = 'application/octet-stream') {
      const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, Body: readStream, ContentType: contentType });
      await s3.send(cmd);
    };
  }
}

export function isCloudConfigured() {
  return Boolean(uploader);
}

export async function uploadStreamToCloud(readStream, key, contentType) {
  if (!uploader) throw new Error('Cloud not configured');
  return uploader(readStream, key, contentType);
}