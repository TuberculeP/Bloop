import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadToR2, isR2Configured } from "../../services/r2.service";

const adminUploadRouter = Router();

// Multer configuration - store in memory for direct R2 upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (_, file, cb) => {
    const allowedMimes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/ogg",
      "audio/flac",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Only audio files allowed.`,
        ),
      );
    }
  },
});

// POST /api/admin/upload
adminUploadRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const { packSlug, folderName } = req.body;
    if (!packSlug) {
      res.status(400).json({ error: "packSlug required" });
      return;
    }

    if (!isR2Configured()) {
      res.status(500).json({ error: "R2 storage not configured" });
      return;
    }

    // Generate unique filename
    const ext = req.file.originalname.split(".").pop() || "mp3";
    const timestamp = Date.now();
    const safeFilename = ext.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();

    const key = folderName
      ? `samples/${packSlug}/${folderName}/${timestamp}-${safeFilename}`
      : `samples/${packSlug}/${timestamp}-${safeFilename}`;

    const result = await uploadToR2(req.file.buffer, key, req.file.mimetype);

    res.json({
      body: {
        filename: `${timestamp}-${safeFilename}`,
        key: result.key,
        url: result.url,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Error handler for multer
adminUploadRouter.use(
  (
    err: Error & { code: string },
    _: Request,
    res: Response,
    next: NextFunction,
  ) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res
          .status(400)
          .json({ error: "File too large. Maximum size is 50MB." });
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

export default adminUploadRouter;
