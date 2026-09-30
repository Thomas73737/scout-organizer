import { Router, type IRouter, type Request, type Response as ExpressResponse } from "express";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/storageService";
import { ObjectPermission } from "../lib/objectAcl";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

// Local storage directory for development
const LOCAL_STORAGE_DIR = path.join(process.cwd(), "local-storage");
const LOCAL_UPLOADS_DIR = path.join(LOCAL_STORAGE_DIR, "uploads");

/**
 * PUT /storage/upload/:objectId
 * PUT /storage/local-upload/:objectId
 *
 * Receives the raw file body and persists it.
 *
 * On the Supabase storage driver the bytes are forwarded to a private
 * Supabase Storage bucket: serverless hosts have no writable, durable
 * filesystem, and proxying through the API keeps the service-role key and any
 * Supabase CORS configuration out of the browser. Local development still
 * writes to disk.
 */
const uploadHandler = async (req: Request, res: ExpressResponse) => {
  const objectId = req.params.objectId;
  const fileName = req.query.filename as string | undefined;

  if (objectStorageService.usesSupabaseDriver) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    const body = Buffer.concat(chunks);

    if (body.length === 0) {
      res.status(400).json({ error: "No file data received" });
      return;
    }

    try {
      await objectStorageService.putPrivateObject(
        `uploads/${objectId}`,
        body,
        req.headers["content-type"],
        fileName,
      );
      res.json({ success: true, objectPath: `/objects/uploads/${objectId}` });
    } catch (error) {
      req.log.error({ err: error }, "Error uploading file to Supabase Storage");
      res.status(500).json({ error: "Failed to upload file" });
    }
    return;
  }

  try {
    const filePath = path.join(LOCAL_UPLOADS_DIR, objectId as string);

    // Ensure directory exists
    if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
      fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
    }

    // Save file
    const fileStream = fs.createWriteStream(filePath);
    req.pipe(fileStream);

    fileStream.on('finish', () => {
      // Save original filename as sidecar metadata
      if (fileName) {
        try {
          fs.writeFileSync(filePath + '.meta', JSON.stringify({ originalName: fileName }), 'utf-8');
        } catch (metaErr) {
          req.log.error({ err: metaErr }, "Error saving file metadata");
        }
      }
      res.json({ success: true, objectPath: `/objects/uploads/${objectId}` });
    });

    fileStream.on('error', (error) => {
      req.log.error({ err: error }, "Error saving file");
      res.status(500).json({ error: "Failed to save file" });
    });
  } catch (error) {
    req.log.error({ err: error }, "Error in local upload");
    res.status(500).json({ error: "Failed to upload file" });
  }
};

router.put("/storage/upload/:objectId", uploadHandler);

// Legacy alias kept for clients pinned to the original local-dev URL.
router.put("/storage/local-upload/:objectId", uploadHandler);

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: ExpressResponse) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    const uploadURL = await objectStorageService.getObjectEntityUploadURL({ name });
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: ExpressResponse) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response: any = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", async (req: Request, res: ExpressResponse) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    // --- Protected route example (uncomment when using replit-auth) ---
    // if (!req.isAuthenticated()) {
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // }
    // const canAccess = await objectStorageService.canAccessObjectEntity({
    //   userId: req.user.id,
    //   objectFile,
    //   requestedPermission: ObjectPermission.READ,
    // });
    // if (!canAccess) {
    //   res.status(403).json({ error: "Forbidden" });
    //   return;
    // }

    const response: any = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
