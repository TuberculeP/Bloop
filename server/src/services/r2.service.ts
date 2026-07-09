import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const CDN_BASE_URL = process.env.CDN_BASE_URL;
const ENVIRONMENT = process.env.NODE_ENV || "development";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "",
  },
});

export interface UploadResult {
  key: string;
  url: string;
}

export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<UploadResult> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        environment: ENVIRONMENT,
        "uploaded-at": new Date().toISOString(),
      },
    }),
  );

  return {
    key,
    url: `${CDN_BASE_URL}/${key}`,
  };
}

export async function deleteFromR2(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }),
  );
}

export function isR2Configured(): boolean {
  return !!(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET_NAME &&
    CDN_BASE_URL
  );
}

export function isR2Url(value: string | null | undefined): boolean {
  return !!value && !!CDN_BASE_URL && value.startsWith(CDN_BASE_URL);
}

export function keyFromR2Url(url: string): string {
  return url.replace(`${CDN_BASE_URL}/`, "");
}

export async function uploadJsonToR2(data: object, key: string): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: "application/json",
      Metadata: {
        environment: ENVIRONMENT,
        "uploaded-at": new Date().toISOString(),
      },
    }),
  );
}

export async function listR2ObjectKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of response.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

export async function getR2Json<T>(key: string): Promise<T | null> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      }),
    );
    const body = await response.Body?.transformToString("utf-8");
    if (!body) return null;
    return JSON.parse(body) as T;
  } catch (err: unknown) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}
