import { randomUUID } from "crypto";
import { supabase } from "@workspace/db";
import { ObjectNotFoundError } from "./objectStorageError";
import type { ObjectAclPolicy } from "./objectAcl";

/**
 * Supabase Storage backend for the object storage service.
 *
 * The Replit/Google Cloud Storage backend cannot run on serverless platforms
 * like Vercel, and the local filesystem backend cannot run there either
 * (read-only + ephemeral between invocations). This backend keeps the same
 * externally-visible contract as the other backends:
 *
 *   - object paths are app-relative, e.g. "/objects/uploads/<uuid>"
 *   - uploads are proxied through the API so the service-role key stays
 *     server-side and the browser never needs Supabase CORS configuration
 *
 * Buckets are configured via:
 *   SUPABASE_STORAGE_BUCKET          (default "uploads", private objects)
 *   SUPABASE_PUBLIC_STORAGE_BUCKET   (default "public", public objects)
 */
export class SupabaseObjectStorageService {
  private readonly privateBucket: string;
  private readonly publicBucket: string;

  constructor() {
    this.privateBucket = process.env.SUPABASE_STORAGE_BUCKET || "uploads";
    this.publicBucket = process.env.SUPABASE_PUBLIC_STORAGE_BUCKET || "public";
  }

  getPublicObjectSearchPaths(): Array<string> {
    return [this.publicBucket];
  }

  getPrivateObjectDir(): string {
    return this.privateBucket;
  }

  /**
   * Uploads are proxied through this API rather than sent to Supabase
   * directly, so the client only ever talks to the same origin.
   */
  async getObjectEntityUploadURL(metadata?: { name?: string }): Promise<string> {
    const objectId = randomUUID();
    let url = `/api/storage/upload/${objectId}`;
    if (metadata?.name) {
      url += `?filename=${encodeURIComponent(metadata.name)}`;
    }
    return url;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("http") && !rawPath.startsWith("/api/")) {
      return rawPath;
    }

    const pathname = rawPath.startsWith("http")
      ? new URL(rawPath).pathname
      : rawPath.split("?")[0];

    if (!pathname.startsWith("/api/storage/upload/")) {
      return pathname;
    }

    const objectId = pathname.split("/").pop();
    return `/objects/uploads/${objectId}`;
  }

  async searchPublicObject(filePath: string): Promise<SupabaseObjectFile | null> {
    for (const bucket of this.getPublicObjectSearchPaths()) {
      const objectPath = `${bucket}/${filePath}`;
      const file = await this.tryGetFile(this.publicBucket, objectPath);
      if (file) return file;
    }
    return null;
  }

  async getObjectEntityFile(objectPath: string): Promise<SupabaseObjectFile> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    const objectPathInBucket = `${this.privateBucket}/${entityId}`;

    const file = await this.tryGetFile(this.privateBucket, objectPathInBucket);
    if (!file) {
      throw new ObjectNotFoundError();
    }
    return file;
  }

  async downloadObject(
    file: SupabaseObjectFile,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    const { data, error } = await supabase.storage
      .from(file.bucket)
      .download(file.path);

    if (error || !data) {
      throw new ObjectNotFoundError();
    }

    const headers: Record<string, string> = {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": `${file.bucket === this.publicBucket ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };

    if (data.size != null) {
      headers["Content-Length"] = String(data.size);
    }

    const originalName = await this.getOriginalName(file);
    if (originalName) {
      headers["Content-Disposition"] =
        `inline; filename="${encodeURIComponent(originalName)}"`;
    }

    return new Response(data as unknown as ReadableStream<Uint8Array>, { headers });
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    _aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    return this.normalizeObjectEntityPath(rawPath);
  }

  async deleteObject(file: SupabaseObjectFile): Promise<void> {
    await supabase.storage.from(file.bucket).remove([file.path]);
    await supabase.storage.from(file.bucket).remove([`${file.path}.meta`]);
  }

  async canAccessObjectEntity(): Promise<boolean> {
    return true;
  }

  /**
   * Persist an upload into the private bucket. Called by the API upload route.
   */
  async putPrivateObject(
    objectPath: string,
    body: Buffer,
    contentType?: string,
    originalName?: string,
  ): Promise<SupabaseObjectFile> {
    const path = `${this.privateBucket}/${objectPath}`;
    const resolvedContentType = contentType || "application/octet-stream";

    const { error } = await supabase.storage
      .from(this.privateBucket)
      .upload(path, body, {
        contentType: resolvedContentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload object: ${error.message}`);
    }

    if (originalName) {
      await this.putMeta(path, originalName);
    }

    return {
      bucket: this.privateBucket,
      path,
      contentType: resolvedContentType,
      size: body.length,
    };
  }

  private async putMeta(path: string, originalName: string): Promise<void> {
    await supabase.storage
      .from(this.privateBucket)
      .upload(`${path}.meta`, JSON.stringify({ originalName }), {
        contentType: "application/json",
        upsert: true,
      });
  }

  private async getOriginalName(
    file: SupabaseObjectFile,
  ): Promise<string | null> {
    const { data } = await supabase.storage
      .from(file.bucket)
      .download(`${file.path}.meta`);

    if (!data) return null;

    try {
      const meta = JSON.parse(await data.text());
      return meta.originalName || null;
    } catch {
      return null;
    }
  }

  private async tryGetFile(
    bucket: string,
    path: string,
  ): Promise<SupabaseObjectFile | null> {
    // The private bucket holds uploads, the public bucket holds public assets.
    // Both are addressed directly, so a single storage call tells us if the
    // object exists without a separate HEAD request.
    const { data, error } = await supabase.storage.from(bucket).list(
      path.split("/").slice(0, -1).join("/"),
      { search: path.split("/").pop() },
    );

    if (error || !data || data.length === 0) {
      return null;
    }

    const match = data.find((entry) => entry.name === path.split("/").pop());
    if (!match) return null;

    return {
      bucket,
      path,
      contentType: (match.metadata?.mimetype as string) ?? null,
      size: (match.metadata?.size as number) ?? null,
    };
  }
}

export interface SupabaseObjectFile {
  bucket: string;
  path: string;
  contentType: string | null;
  size: number | null;
}
