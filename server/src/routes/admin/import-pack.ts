import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import AdmZip from "adm-zip";
import path from "path";
import FileType from "file-type";
import {
  uploadToR2,
  deleteFromR2,
  isR2Configured,
} from "../../services/r2.service";
import pg from "../../config/db.config";
import { SamplePack } from "../../config/entities/SamplePack";
import { SampleFolder } from "../../config/entities/SampleFolder";
import { AudioSample } from "../../config/entities/AudioSample";

const importPackRouter = Router();

const ALLOWED_AUDIO_MIMES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/vnd.wave",
  "audio/ogg",
  "audio/flac",
  "audio/x-flac",
];

// Fallback MIME types based on extension (when file-type can't detect)
const EXT_TO_MIME: Record<string, string> = {
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
};

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];

const AUDIO_EXTENSIONS = [".wav", ".mp3", ".ogg", ".flac"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

interface ParsedFile {
  path: string;
  folderName: string;
  fileName: string;
  buffer: Buffer;
  mimeType: string;
}

interface ParsedStructure {
  folders: Map<string, ParsedFile[]>;
  cover: ParsedFile | null;
  warnings: string[];
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.originalname.toLowerCase().endsWith(".zip")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only ZIP files are allowed"));
    }
  },
});

function isPathSafe(entryPath: string): boolean {
  const normalized = path.normalize(entryPath);
  if (normalized.includes("..")) return false;
  if (path.isAbsolute(normalized)) return false;
  if (entryPath.includes("\\")) return false;
  if (entryPath.startsWith("/")) return false;
  return true;
}

function sanitizeFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

async function parseZipStructure(zipBuffer: Buffer): Promise<ParsedStructure> {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  const folders = new Map<string, ParsedFile[]>();
  let cover: ParsedFile | null = null;
  const warnings: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const entryPath = entry.entryName;

    if (!isPathSafe(entryPath)) {
      warnings.push(`Skipped unsafe path: ${entryPath}`);
      continue;
    }

    const compressedSize = entry.header.compressedSize || 1;
    const uncompressedSize = entry.header.size || 0;
    const ratio = uncompressedSize / compressedSize;
    if (ratio > 100) {
      warnings.push(`Skipped suspicious compression ratio: ${entryPath}`);
      continue;
    }

    const ext = path.extname(entryPath).toLowerCase();
    const baseName = path.basename(entryPath, ext);
    const pathParts = entryPath.split("/").filter(Boolean);

    if (baseName.startsWith(".") || baseName.startsWith("__MACOSX")) {
      continue;
    }

    const buffer = entry.getData();
    const fileType = await FileType.fromBuffer(buffer);

    if (IMAGE_EXTENSIONS.includes(ext)) {
      if (!fileType || !ALLOWED_IMAGE_MIMES.includes(fileType.mime)) {
        warnings.push(`Invalid image file: ${entryPath}`);
        continue;
      }

      const lowerName = baseName.toLowerCase();
      if (
        lowerName === "cover" ||
        lowerName === "artwork" ||
        lowerName === "folder"
      ) {
        cover = {
          path: entryPath,
          folderName: "",
          fileName: `cover${path.extname(entryPath)}`,
          buffer,
          mimeType: fileType.mime,
        };
      }
      continue;
    }

    if (!AUDIO_EXTENSIONS.includes(ext)) {
      warnings.push(`Skipped non-audio file: ${entryPath}`);
      continue;
    }

    // Determine MIME type: use file-type detection or fallback to extension-based
    let mimeType: string;
    if (fileType && ALLOWED_AUDIO_MIMES.includes(fileType.mime)) {
      mimeType = fileType.mime;
    } else if (EXT_TO_MIME[ext]) {
      // Fallback: trust extension for known audio formats
      mimeType = EXT_TO_MIME[ext];
    } else {
      warnings.push(`Invalid audio file (bad MIME): ${entryPath}`);
      continue;
    }

    let folderName: string;
    if (pathParts.length > 1) {
      folderName = pathParts[0];
    } else {
      folderName = "featured";
    }

    const parsedFile: ParsedFile = {
      path: entryPath,
      folderName,
      fileName: baseName,
      buffer,
      mimeType,
    };

    if (!folders.has(folderName)) {
      folders.set(folderName, []);
    }
    folders.get(folderName)!.push(parsedFile);
  }

  return { folders, cover, warnings };
}

function sendSSE(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

importPackRouter.post("/", upload.single("zipFile"), async (req, res) => {
  const uploadedR2Keys: string[] = [];

  // Validate before starting SSE
  if (!req.file) {
    res.status(400).json({ error: "No ZIP file provided" });
    return;
  }

  const { name, slug, author } = req.body;

  if (!name || !slug) {
    res.status(400).json({ error: "Name and slug are required" });
    return;
  }

  if (!isR2Configured()) {
    res.status(500).json({ error: "R2 storage not configured" });
    return;
  }

  const packRepo = pg.getRepository(SamplePack);
  const existing = await packRepo.findOne({ where: { slug } });
  if (existing) {
    res.status(400).json({ error: "Slug already exists" });
    return;
  }

  // Start SSE response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    sendSSE(res, { type: "progress", progress: 5, file: "Parsing ZIP..." });

    const structure = await parseZipStructure(req.file.buffer);

    if (structure.folders.size === 0) {
      sendSSE(res, {
        type: "error",
        error: "No valid audio files found in ZIP",
      });
      res.end();
      return;
    }

    // Count total files for progress
    let totalFiles = 0;
    for (const files of structure.folders.values()) {
      totalFiles += files.length;
    }
    if (structure.cover) totalFiles++;

    sendSSE(res, { type: "progress", progress: 10, file: "Creating pack..." });

    const queryRunner = pg.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const pack = queryRunner.manager.create(SamplePack, {
        name,
        slug,
        author: author || null,
        featured: false,
        isActive: true,
      });
      const savedPack = await queryRunner.manager.save(pack);

      let foldersCount = 0;
      let samplesCount = 0;
      let processedFiles = 0;

      const sortedFolders = Array.from(structure.folders.keys()).sort();

      for (let i = 0; i < sortedFolders.length; i++) {
        const folderName = sortedFolders[i];
        const files = structure.folders.get(folderName)!;

        const folder = queryRunner.manager.create(SampleFolder, {
          name: folderName,
          order: i,
          packId: savedPack.id,
        });
        const savedFolder = await queryRunner.manager.save(folder);
        foldersCount++;

        for (const file of files) {
          const timestamp = Date.now();
          const safeFilename = sanitizeFilename(file.fileName);
          const ext = path.extname(file.path).toLowerCase();
          const r2Key = `samples/${slug}/${sanitizeFilename(folderName)}/${timestamp}-${safeFilename}${ext}`;

          // Send progress
          processedFiles++;
          const progress = Math.round(10 + (processedFiles / totalFiles) * 85);
          sendSSE(res, {
            type: "progress",
            progress,
            file: `${folderName}/${file.fileName}${ext}`,
          });

          const r2Result = await uploadToR2(file.buffer, r2Key, file.mimeType);
          uploadedR2Keys.push(r2Key);

          const sample = queryRunner.manager.create(AudioSample, {
            name: file.fileName,
            filename: `${timestamp}-${safeFilename}${ext}`,
            duration: 0,
            folderId: savedFolder.id,
            fullUrl: r2Result.url,
            previewUrl: r2Result.url,
          });
          await queryRunner.manager.save(sample);
          samplesCount++;
        }
      }

      if (structure.cover) {
        sendSSE(res, {
          type: "progress",
          progress: 98,
          file: "Uploading cover...",
        });
        const coverKey = `samples/${slug}/cover${path.extname(structure.cover.path)}`;
        await uploadToR2(
          structure.cover.buffer,
          coverKey,
          structure.cover.mimeType,
        );
        uploadedR2Keys.push(coverKey);

        savedPack.cover = `cover${path.extname(structure.cover.path)}`;
        await queryRunner.manager.save(savedPack);
      }

      await queryRunner.commitTransaction();

      sendSSE(res, {
        type: "complete",
        pack: {
          id: savedPack.id,
          name: savedPack.name,
          slug: savedPack.slug,
          foldersCount,
          samplesCount,
        },
        warnings:
          structure.warnings.length > 0 ? structure.warnings : undefined,
      });
      res.end();
    } catch (dbError) {
      await queryRunner.rollbackTransaction();

      for (const key of uploadedR2Keys) {
        try {
          await deleteFromR2(key);
        } catch (cleanupError) {
          console.error(`Failed to cleanup R2 key ${key}:`, cleanupError);
        }
      }

      throw dbError;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error("Import pack error:", error);

    for (const key of uploadedR2Keys) {
      try {
        await deleteFromR2(key);
      } catch (cleanupError) {
        console.error(`Failed to cleanup R2 key ${key}:`, cleanupError);
      }
    }

    sendSSE(res, {
      type: "error",
      error: error instanceof Error ? error.message : "Import failed",
    });
    res.end();
  }
});

importPackRouter.use(
  (
    err: Error & { code?: string },
    _: Request,
    res: Response,
    next: NextFunction,
  ) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res
          .status(400)
          .json({ error: "ZIP file too large. Maximum size is 500MB." });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    next();
  },
);

export default importPackRouter;
