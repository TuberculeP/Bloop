import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadToR2, isR2Configured } from "../../services/r2.service";

const learningUploadRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, GIF allowed.`,
        ),
      );
    }
  },
});

// POST /api/learning/upload-image
learningUploadRouter.post("/", upload.single("file"), async (req, res) => {
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

    const ext = req.file.originalname.split(".").pop() || "png";
    const timestamp = Date.now();
    const safeFilename = `${timestamp}.${ext.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase()}`;
    const key = `learning/${safeFilename}`;

    const result = await uploadToR2(req.file.buffer, key, req.file.mimetype);

    res.status(200).json({
      status: 200,
      message: "Image uploaded",
      body: {
        url: result.url,
        key: result.key,
        filename: safeFilename,
      },
    });
  } catch (error) {
    console.error("Learning image upload error:", error);
    res.status(500).json({ status: 500, message: "Upload failed" });
  }
});

// Error handler for multer
learningUploadRouter.use(
  (
    err: Error & { code: string },
    _: Request,
    res: Response,
    next: NextFunction,
  ) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          status: 400,
          message: "File too large. Maximum size is 10MB.",
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

export default learningUploadRouter;
