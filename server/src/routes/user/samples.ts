import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import pg from "../../config/db.config";
import { User } from "../../config/entities/User";
import { UserSample } from "../../config/entities/UserSample";
import {
  uploadToR2,
  deleteFromR2,
  isR2Configured,
} from "../../services/r2.service";
import { sanitizeFilename } from "../../utils/sanitize";
import {
  USER_SAMPLE_QUOTA_BYTES,
  USER_SAMPLE_MAX_FILE_BYTES,
} from "../../config/quota.config";

const userSamplesRouter = Router();

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: USER_SAMPLE_MAX_FILE_BYTES },
  fileFilter: (_, file, cb) => {
    if (ALLOWED_AUDIO_MIMES.includes(file.mimetype)) {
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

// GET /api/user/samples
userSamplesRouter.get("/", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ status: 401, message: "User not logged in" });
    return;
  }

  const samples = await pg.getRepository(UserSample).find({
    where: { userId: req.user.id },
    order: { createdAt: "DESC" },
  });

  res.status(200).json({ status: 200, samples });
});

// GET /api/user/samples/storage
userSamplesRouter.get("/storage", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ status: 401, message: "User not logged in" });
    return;
  }

  const user = await pg
    .getRepository(User)
    .findOne({ where: { id: req.user.id } });
  if (!user) {
    res.status(404).json({ status: 404, message: "User not found" });
    return;
  }

  res.status(200).json({
    status: 200,
    usedBytes: user.storageUsedBytes,
    quotaBytes: USER_SAMPLE_QUOTA_BYTES,
  });
});

// POST /api/user/samples
userSamplesRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ status: 401, message: "User not logged in" });
      return;
    }

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

    const userRepository = pg.getRepository(User);
    const user = await userRepository.findOne({ where: { id: req.user.id } });
    if (!user) {
      res.status(404).json({ status: 404, message: "User not found" });
      return;
    }

    const newUsedBytes = user.storageUsedBytes + req.file.size;
    if (newUsedBytes > USER_SAMPLE_QUOTA_BYTES) {
      res.status(400).json({
        status: 400,
        message: "Quota exceeded",
        usedBytes: user.storageUsedBytes,
        quotaBytes: USER_SAMPLE_QUOTA_BYTES,
      });
      return;
    }

    const timestamp = Date.now();
    const safeFilename = sanitizeFilename(req.file.originalname);
    const ext = path.extname(req.file.originalname).toLowerCase();
    const key = `user-samples/${user.id}/${timestamp}-${safeFilename}${ext}`;

    const result = await uploadToR2(req.file.buffer, key, req.file.mimetype);

    const queryRunner = pg.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sample = queryRunner.manager.create(UserSample, {
        name: req.file.originalname,
        filename: `${timestamp}-${safeFilename}${ext}`,
        size: req.file.size,
        duration: 0,
        fullUrl: result.url,
        userId: user.id,
      });
      const savedSample = await queryRunner.manager.save(sample);

      user.storageUsedBytes = newUsedBytes;
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      res.status(201).json({
        status: 201,
        sample: savedSample,
        usedBytes: newUsedBytes,
        quotaBytes: USER_SAMPLE_QUOTA_BYTES,
      });
    } catch (dbError) {
      await queryRunner.rollbackTransaction();
      try {
        await deleteFromR2(key);
      } catch (cleanupError) {
        console.error(`Failed to cleanup R2 key ${key}:`, cleanupError);
      }
      throw dbError;
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error("User sample upload error:", error);
    res.status(500).json({ status: 500, message: "Upload failed" });
  }
});

// DELETE /api/user/samples/:id
userSamplesRouter.delete("/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ status: 401, message: "User not logged in" });
      return;
    }

    const sampleRepository = pg.getRepository(UserSample);
    const sample = await sampleRepository.findOne({
      where: { id: req.params.id },
    });

    if (!sample) {
      res.status(404).json({ status: 404, message: "Sample not found" });
      return;
    }

    if (sample.userId !== req.user.id) {
      res.status(403).json({ status: 403, message: "Forbidden" });
      return;
    }

    const userRepository = pg.getRepository(User);
    const user = await userRepository.findOne({ where: { id: req.user.id } });
    if (!user) {
      res.status(404).json({ status: 404, message: "User not found" });
      return;
    }

    const key = sample.fullUrl?.split("/").slice(-3).join("/");

    await sampleRepository.remove(sample);

    if (key) {
      try {
        await deleteFromR2(key);
      } catch (error) {
        console.error(`Failed to delete R2 key ${key}:`, error);
      }
    }

    user.storageUsedBytes = Math.max(0, user.storageUsedBytes - sample.size);
    await userRepository.save(user);

    res.status(200).json({
      status: 200,
      usedBytes: user.storageUsedBytes,
      quotaBytes: USER_SAMPLE_QUOTA_BYTES,
    });
  } catch (error) {
    console.error("User sample delete error:", error);
    res.status(500).json({ status: 500, message: "Delete failed" });
  }
});

// Error handler for multer
userSamplesRouter.use(
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
          message: `File too large. Maximum size is ${
            USER_SAMPLE_MAX_FILE_BYTES / (1024 * 1024)
          }MB.`,
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

export default userSamplesRouter;
