import { S3Client } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export async function getSignedReadUrl(key: string, expiresIn = 300): Promise<string | null> {
  const s3 = getS3Client();
  if (!s3 || !s3Bucket) {
    return null;
  }

  const command = new GetObjectCommand({
    Bucket: s3Bucket,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
}
