import { Router } from "express";
import multer from "multer";
import { isAuth } from "../../middleware/auth.middleware";
import { uploadToR2, isR2Configured } from "../../services/r2.service";

const recordingsRouter = Router();

recordingsRouter.use(isAuth);

const EXT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
};

const baseMimeType = (mimetype: string): string =>
  mimetype.split(";")[0].trim();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_, file, cb) => {
    if (EXT_BY_MIME[baseMimeType(file.mimetype)]) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

// POST /api/app/recordings - Upload d'un enregistrement vocal (micro) vers R2
recordingsRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ status: 400, message: "No file provided" });
      return;
    }

    if (!isR2Configured()) {
      res
        .status(500)
        .json({ status: 500, message: "R2 storage not configured" });
      return;
    }

    const ext = EXT_BY_MIME[baseMimeType(req.file.mimetype)] || "webm";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const key = `recordings/${req.user!.id}/${timestamp}-${random}.${ext}`;

    const result = await uploadToR2(
      req.file.buffer,
      key,
      baseMimeType(req.file.mimetype),
    );

    res.status(200).json({
      status: 200,
      message: "Recording uploaded",
      body: {
        key: result.key,
        url: result.url,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error("Recording upload error:", error);
    res.status(500).json({ status: 500, message: "Upload failed" });
  }
});

recordingsRouter.use(
  (err: Error & { code?: string }, _req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          status: 400,
          message: "File too large. Maximum size is 20MB.",
        });
        return;
      }
      res.status(400).json({ status: 400, message: err.message });
      return;
    }
    if (err) {
      res.status(400).json({ status: 400, message: err.message });
      return;
    }
    next();
  },
);

export default recordingsRouter;
