import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

export const s3Bucket = process.env.S3_BUCKET;

export function getS3Client(): S3Client | null {
  if (!region || !accessKeyId || !secretAccessKey || !s3Bucket) {
    return null;
  }
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function getPublicFileUrl(key: string): string {
  const customBase = process.env.S3_PUBLIC_BASE_URL?.trim();
  if (customBase) {
    return `${customBase.replace(/\/$/, "")}/${key}`;
  }
  return `https://${s3Bucket}.s3.${region}.amazonaws.com/${key}`;
}
