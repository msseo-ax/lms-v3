import { NextRequest, NextResponse } from "next/server";
import { badRequest } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getSignedReadUrl, s3Bucket } from "@/lib/s3";

function getS3Hosts(): string[] {
  const region = process.env.AWS_REGION?.trim();
  const bucket = s3Bucket?.trim();
  if (!bucket) return [];

  const hosts = [`${bucket}.s3.amazonaws.com`];
  if (region) {
    hosts.push(`${bucket}.s3.${region}.amazonaws.com`);
  }
  return hosts;
}

function extractS3Key(fileUrl: string, parsed: URL): string | null {

  const customBase = process.env.S3_PUBLIC_BASE_URL?.trim();
  if (customBase) {
    const normalizedBase = customBase.replace(/\/$/, "");
    if (fileUrl.startsWith(`${normalizedBase}/`)) {
      return decodeURIComponent(fileUrl.slice(normalizedBase.length + 1));
    }
  }

  const allowedHosts = new Set(getS3Hosts());
  if (!allowedHosts.has(parsed.host)) {
    const prefix = (process.env.S3_UPLOAD_PREFIX ?? "uploads").replace(/^\/+|\/+$/g, "");
    const path = parsed.pathname.replace(/^\//, "");
    if (path.startsWith(`${prefix}/`)) {
      return decodeURIComponent(path);
    }
    return null;
  }

  const key = parsed.pathname.replace(/^\//, "");
  return key ? decodeURIComponent(key) : null;
}

async function recordFileAccess(userId: string, contentFileId: string) {
  try {
    const { prisma } = await import("@/lib/prisma");
    if (!prisma) return;
    await prisma.fileAccessLog.create({
      data: { contentFileId, userId },
    });
  } catch {
    // duplicate or missing FK — ignore
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  const contentFileId = request.nextUrl.searchParams.get("contentFileId");
  if (user && contentFileId) {
    // fire-and-forget
    recordFileAccess(user.id, contentFileId).catch(() => {});
  }

  const fileUrl = request.nextUrl.searchParams.get("fileUrl");
  if (!fileUrl) {
    return badRequest("fileUrl is required");
  }

  let parsed: URL;
  try {
    parsed = new URL(fileUrl, request.nextUrl.origin);
  } catch {
    return badRequest("Invalid fileUrl");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return badRequest("Invalid fileUrl protocol");
  }

  const resolve = request.nextUrl.searchParams.get("resolve") === "true";

  const isMockUpload = parsed.pathname.startsWith("/mock/uploads/");
  if (isMockUpload) {
    if (resolve) return NextResponse.json({ url: parsed.toString() });
    return NextResponse.redirect(parsed);
  }

  const key = extractS3Key(fileUrl, parsed);
  if (!key) {
    if (resolve) return NextResponse.json({ url: fileUrl });
    return NextResponse.redirect(parsed);
  }

  const signedUrl = await getSignedReadUrl(key, resolve ? 3600 : 300);
  if (!signedUrl) {
    if (resolve) return NextResponse.json({ url: fileUrl });
    return NextResponse.redirect(parsed);
  }

  if (resolve) {
    return NextResponse.json({ url: signedUrl });
  }

  return NextResponse.redirect(signedUrl);
}
