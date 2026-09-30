import type { File } from "@google-cloud/storage";
import * as fs from "fs";
import * as path from "path";
import { ObjectStorageService as ReplitObjectStorageService } from "./objectStorage";
import {
  SupabaseObjectStorageService,
  type SupabaseObjectFile,
} from "./supabaseStorage";
import type { ObjectAclPolicy, ObjectPermission } from "./objectAcl";

export { ObjectNotFoundError } from "./objectStorageError";
export type { SupabaseObjectFile };

/**
 * Object storage handles are opaque to callers: they are always handed straight
 * back to the service that produced them. Each backend returns its own native
 * handle type, so the union is resolved here rather than at every call site.
 */
export type ObjectFile = File | SupabaseObjectFile;

const IS_SUPABASE_DRIVER =
  process.env.STORAGE_DRIVER === "supabase" ||
  (process.env.STORAGE_DRIVER !== "replit" && Boolean(process.env.VERCEL));

/**
 * Storage driver selection.
 *
 * - "supabase": Supabase Storage. Required on serverless hosts (Vercel), where
 *   neither Google Cloud Storage (needs the Replit sidecar on 127.0.0.1) nor the
 *   local filesystem (read-only, ephemeral) can work.
 * - "replit": the original Google Cloud Storage / local-filesystem backend.
 */
export class ObjectStorageService {
  private readonly supabase: SupabaseObjectStorageService | null;
  private readonly replit: ReplitObjectStorageService | null;

  constructor() {
    this.supabase = IS_SUPABASE_DRIVER ? new SupabaseObjectStorageService() : null;
    this.replit = IS_SUPABASE_DRIVER ? null : new ReplitObjectStorageService();
  }

  getPublicObjectSearchPaths(): Array<string> {
    return this.requireAny().getPublicObjectSearchPaths();
  }

  getPrivateObjectDir(): string {
    return this.requireAny().getPrivateObjectDir();
  }

  async getObjectEntityUploadURL(metadata?: { name?: string }): Promise<string> {
    return this.requireAny().getObjectEntityUploadURL(metadata);
  }

  normalizeObjectEntityPath(rawPath: string): string {
    return this.requireAny().normalizeObjectEntityPath(rawPath);
  }

  async searchPublicObject(filePath: string): Promise<ObjectFile | null> {
    return this.requireAny().searchPublicObject(filePath) as Promise<ObjectFile | null>;
  }

  async getObjectEntityFile(objectPath: string): Promise<ObjectFile> {
    return this.requireAny().getObjectEntityFile(objectPath) as Promise<ObjectFile>;
  }

  async downloadObject(
    file: ObjectFile,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    if (this.supabase) {
      return this.supabase.downloadObject(
        file as SupabaseObjectFile,
        cacheTtlSec,
      );
    }
    return this.requireReplit().downloadObject(file as File, cacheTtlSec);
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    return this.requireAny().trySetObjectEntityAclPolicy(rawPath, aclPolicy);
  }

  async deleteObject(file: ObjectFile): Promise<void> {
    if (this.supabase) {
      await this.supabase.deleteObject(file as SupabaseObjectFile);
      return;
    }
    await this.requireReplit().deleteObject(file as File);
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: ObjectFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    if (this.supabase) {
      return this.supabase.canAccessObjectEntity();
    }
    return this.requireReplit().canAccessObjectEntity({
      userId,
      objectFile: objectFile as File,
      requestedPermission,
    });
  }

  /**
   * Write an upload into the private bucket. On the Supabase driver this is the
   * only durable location; on the Replit/local driver uploads land on the
   * local filesystem, which is what local development has always used.
   */
  async putPrivateObject(
    objectPath: string,
    body: Buffer,
    contentType?: string,
    originalName?: string,
  ): Promise<void> {
    if (this.supabase) {
      await this.supabase.putPrivateObject(
        objectPath,
        body,
        contentType,
        originalName,
      );
      return;
    }

    const dir = path.join(process.cwd(), "local-storage", "uploads");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, path.basename(objectPath));
    fs.writeFileSync(filePath, body);
    fs.writeFileSync(
      filePath + ".meta",
      JSON.stringify({ originalName: originalName ?? null }),
      "utf-8",
    );
  }

  get usesSupabaseDriver(): boolean {
    return IS_SUPABASE_DRIVER;
  }

  private requireAny() {
    if (this.supabase) return this.supabase;
    return this.requireReplit();
  }

  private requireReplit(): ReplitObjectStorageService {
    if (!this.replit) {
      throw new Error("Replit object storage backend is not active");
    }
    return this.replit;
  }
}
