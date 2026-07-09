import { Storage, File } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const MAGIC_BYTES_MAP: Array<{ bytes: number[]; offset: number; mime: string }> = [
  { bytes: [0xFF, 0xD8, 0xFF], offset: 0, mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0, mime: "image/png" },
  { bytes: [0x47, 0x49, 0x46], offset: 0, mime: "image/gif" },
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mime: "image/webp" },
  { bytes: [0x42, 0x4D], offset: 0, mime: "image/bmp" },
  { bytes: [0x00, 0x00, 0x01, 0x00], offset: 0, mime: "image/x-icon" },
  { bytes: [0x38, 0x42, 0x50, 0x53], offset: 0, mime: "image/vnd.adobe.photoshop" },
  { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0, mime: "application/pdf" },
  { bytes: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], offset: 4, mime: "image/heif" },
  { bytes: [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70], offset: 4, mime: "image/heif" },
  { bytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], offset: 4, mime: "image/heic" },
];

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const IS_LOCAL_DEV = !process.env.REPLIT_DEPLOYMENT;

// Local storage directory for development
const LOCAL_STORAGE_DIR = path.join(process.cwd(), "local-storage");
const LOCAL_UPLOADS_DIR = path.join(LOCAL_STORAGE_DIR, "uploads");

// Ensure local storage directories exist
if (IS_LOCAL_DEV) {
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }
}

export const objectStorageClient = IS_LOCAL_DEV ? null : new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    if (IS_LOCAL_DEV) {
      return [LOCAL_STORAGE_DIR];
    }
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    if (IS_LOCAL_DEV) {
      return LOCAL_STORAGE_DIR;
    }
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    if (IS_LOCAL_DEV) {
      // Local file system fallback
      for (const searchPath of this.getPublicObjectSearchPaths()) {
        const fullPath = path.join(searchPath, filePath);
        if (fs.existsSync(fullPath)) {
          // Return a mock File object for local files
          return this.createMockFile(fullPath);
        }
      }
      return null;
    }

    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient!.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(file: File, cacheTtlSec: number = 3600): Promise<globalThis.Response> {
    if (IS_LOCAL_DEV && this.isMockFile(file)) {
      // Handle local file download
      const filePath = (file as any).localPath;
      const fileStream = fs.createReadStream(filePath);
      const webStream = Readable.toWeb(fileStream) as ReadableStream;
      const stats = fs.statSync(filePath);
      const originalName = (file as any).originalName as string | null;
      const contentType = this.getMimeType(originalName, filePath);

      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
        "Content-Length": String(stats.size),
      };

      if (originalName) {
        headers["Content-Disposition"] = `inline; filename="${encodeURIComponent(originalName)}"`;
      }

      return new Response(webStream, { headers });
    }

    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) {
      headers["Content-Length"] = String(metadata.size);
    }

    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(metadata?: { name?: string }): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    if (IS_LOCAL_DEV) {
      // For local development, return a relative API endpoint for upload.
      // The frontend (Vite proxy) forwards /api/* to this server, so relative
      // URLs work from any host (localhost, ngrok, etc.).
      let url = `/api/storage/local-upload/${objectId}`;
      if (metadata?.name) {
        url += `?filename=${encodeURIComponent(metadata.name)}`;
      }
      return url;
    }

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;

    if (IS_LOCAL_DEV) {
      // Handle local file system
      const filePath = path.join(entityDir, entityId);
      if (fs.existsSync(filePath)) {
        return this.createMockFile(filePath);
      }
      throw new ObjectNotFoundError();
    }

    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient!.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // Handle local development URLs (both relative and absolute)
    if (IS_LOCAL_DEV && rawPath.includes('local-upload')) {
      const pathname = rawPath.startsWith('http') ? new URL(rawPath).pathname : rawPath.split('?')[0];
      const objectId = pathname.split('/').pop();
      return `/objects/uploads/${objectId}`;
    }

    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async deleteObject(file: File): Promise<void> {
    if (IS_LOCAL_DEV && this.isMockFile(file)) {
      const filePath = (file as any).localPath;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      const metaPath = filePath + '.meta';
      if (fs.existsSync(metaPath)) {
        fs.unlinkSync(metaPath);
      }
      return;
    }
    await file.delete();
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    if (IS_LOCAL_DEV && this.isMockFile(objectFile)) {
      // Local files are always accessible in development
      return true;
    }
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  private getOriginalName(filePath: string): string | null {
    try {
      const metaPath = filePath + '.meta';
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        return meta.originalName || null;
      }
    } catch {}
    return null;
  }

  private getMimeType(originalName: string | null, filePath?: string): string {
    const ext = originalName ? path.extname(originalName).toLowerCase() : '';
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.zip': 'application/zip',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.heic': 'image/heic',
      '.heif': 'image/heif',
      '.avif': 'image/avif',
    };
    if (ext && mimeMap[ext]) return mimeMap[ext];
    if (filePath) {
      const detected = this.detectMimeFromFile(filePath);
      if (detected) return detected;
    }
    return "image/jpeg";
  }

  private detectMimeFromFile(filePath: string | null): string {
    if (!filePath) return "image/jpeg";
    try {
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(16);
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);
      const detected = this.detectMimeFromBuffer(buffer);
      return detected || "image/jpeg";
    } catch {
      return "image/jpeg";
    }
  }

  private detectMimeFromBuffer(buffer: Buffer): string | null {
    for (const entry of MAGIC_BYTES_MAP) {
      let match = true;
      for (let i = 0; i < entry.bytes.length; i++) {
        const byteIndex = entry.offset + i;
        if (byteIndex >= buffer.length || buffer[byteIndex] !== entry.bytes[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        if (entry.mime === "image/webp") {
          if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            return "image/webp";
          }
          continue;
        }
        return entry.mime;
      }
    }
    return null;
  }

  // Helper methods for local file system mock
  private createMockFile(filePath: string): File {
    const originalName = this.getOriginalName(filePath);
    const contentType = this.getMimeType(originalName, filePath);
    const mockFile = {
      localPath: filePath,
      isMock: true,
      originalName,
      getMetadata: async () => {
        const stats = fs.statSync(filePath);
        return {
          contentType,
          size: stats.size,
        };
      },
      createReadStream: () => fs.createReadStream(filePath),
      exists: async () => [fs.existsSync(filePath)],
    } as any;
    return mockFile;
  }

  private isMockFile(file: File): boolean {
    return (file as any).isMock === true;
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const body: any = await response.json();
  const signedURL = body?.signed_url ?? body?.signedUrl ?? body?.signedURL;
  if (!signedURL) {
    throw new Error("Signed URL not found in response");
  }
  return signedURL;
}
