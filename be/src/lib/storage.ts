import path from "node:path";
import fs from "node:fs/promises";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { attachmentDisposition } from "./contentDisposition";

/**
 * Two drivers: "s3" (any S3-compatible service — Supabase Storage in this
 * project, Cloudflare R2 also supported) and "local" (disk + an unsigned
 * /files/* route in server.ts, for developing without cloud storage
 * credentials). Picked via STORAGE_DRIVER; defaults to "local" so a
 * fresh checkout can upload real files with zero cloud setup.
 * Never use "local" in production — see the deploy section in CLAUDE.md.
 */
const DRIVER = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";

const LOCAL_ROOT = path.join(__dirname, "..", "..", "uploads");
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

const bucket = process.env.STORAGE_BUCKET as string;

const s3 =
  DRIVER === "s3"
    ? new S3Client({
        region: process.env.STORAGE_REGION || "auto",
        endpoint: process.env.STORAGE_ENDPOINT, // e.g. Supabase Storage or Cloudflare R2 S3 endpoint
        forcePathStyle: true, // required by Supabase Storage's S3 endpoint (and harmless for R2)
        credentials: {
          accessKeyId: process.env.STORAGE_ACCESS_KEY_ID as string,
          secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY as string,
        },
      })
    : null;

export async function uploadObject(key: string, body: Buffer, contentType: string) {
  if (DRIVER === "local") {
    const filePath = path.join(LOCAL_ROOT, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    return key;
  }

  await s3!.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  return key;
}

export async function getSignedDownloadUrl(
  key: string,
  options: { expiresInSec?: number; downloadFilename?: string } = {}
) {
  const { expiresInSec = 3600, downloadFilename } = options;

  if (DRIVER === "local") {
    // No real expiry locally — fine for dev, never for prod (see note above).
    // downloadFilename rides along as a query param — server.ts's /files
    // middleware turns it into a Content-Disposition header so the browser
    // saves the file instead of navigating to it, matching S3's behavior below.
    const suffix = downloadFilename ? `?download=${encodeURIComponent(downloadFilename)}` : "";
    return `${PUBLIC_BASE_URL}/files/${key}${suffix}`;
  }

  return getSignedUrl(
    s3!,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ...(downloadFilename ? { ResponseContentDisposition: attachmentDisposition(downloadFilename) } : {}),
    }),
    { expiresIn: expiresInSec }
  );
}

/**
 * Returns the raw file body as a Node Readable — used by the zip-download
 * routes (be/src/routes/{media,albums}.ts) to stream several objects into an
 * archive without round-tripping through a signed URL for each one.
 */
export async function getObjectStream(key: string): Promise<NodeJS.ReadableStream> {
  if (DRIVER === "local") {
    return (await import("node:fs")).createReadStream(path.join(LOCAL_ROOT, key));
  }

  const result = await s3!.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return result.Body as NodeJS.ReadableStream;
}

export async function deleteObject(key: string) {
  if (DRIVER === "local") {
    await fs.rm(path.join(LOCAL_ROOT, key), { force: true });
    return;
  }

  await s3!.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
