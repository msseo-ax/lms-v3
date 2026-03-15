import { NextRequest } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ok, badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getS3Client, s3Bucket, getPublicFileUrl } from "@/lib/s3";

const MAX_FILE_SIZE = 300 * 1024 * 1024;

const ALLOWED_PREFIXES = ["video/", "audio/", "image/"];
const ALLOWED_EXACT = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/ogg",
];

function isAllowedType(mimeType: string): boolean {
  return (
    ALLOWED_PREFIXES.some((prefix) => mimeType.startsWith(prefix)) ||
    ALLOWED_EXACT.includes(mimeType)
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const body = await request.json();
  const { fileName, contentType, fileSize } = body;

  if (!fileName || !contentType) {
    return badRequest("fileName and contentType are required");
  }

  if (fileSize && fileSize > MAX_FILE_SIZE) {
    return badRequest("File size exceeds 300MB limit");
  }

  if (!isAllowedType(contentType)) {
    return badRequest("File type not allowed");
  }

  const s3 = getS3Client();
  if (!s3 || !s3Bucket) {
    return ok({
      uploadUrl: null,
      fileUrl: `/mock/uploads/${Date.now()}-${fileName}`,
      key: `mock/${fileName}`,
      mock: true,
    });
  }

  const key = `lms/uploads/${Date.now()}-${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const command = new PutObjectCommand({
    Bucket: s3Bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return ok({
    uploadUrl,
    fileUrl: getPublicFileUrl(key),
    key,
    mock: false,
  });
}
