import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import pg from "../../config/db.config";
import { User } from "../../config/entities/User";
import {
  uploadToR2,
  deleteFromR2,
  isR2Configured,
  isR2Url,
  keyFromR2Url,
} from "../../services/r2.service";

const userRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP allowed.`,
        ),
      );
    }
  },
});

// POST /api/user/avatar
userRouter.post("/avatar", upload.single("file"), async (req, res) => {
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

    const previousPicture = user.profilePicture;

    const ext = req.file.originalname.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const safeFilename = ext.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
    const key = `avatars/${user.id}/${timestamp}-${safeFilename}`;

    const result = await uploadToR2(req.file.buffer, key, req.file.mimetype);

    user.profilePicture = result.url;
    await userRepository.save(user);

    if (isR2Url(previousPicture)) {
      try {
        await deleteFromR2(keyFromR2Url(previousPicture));
      } catch (error) {
        console.error("Failed to delete previous avatar from R2:", error);
      }
    }

    res.status(200).json({
      status: 200,
      message: "Avatar updated",
      user,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    res.status(500).json({ status: 500, message: "Upload failed" });
  }
});

// Error handler for multer (avatar upload only)
userRouter.use(
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
          message: "File too large. Maximum size is 5MB.",
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

userRouter.patch("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "User not logged in",
      });
      return;
    }

    const userRepository = pg.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.user.id },
    });

    if (user) {
      const { firstName, lastName, email } = req.body;

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (email) user.email = email;

      await userRepository.save(user);

      res.status(200).json({
        status: 200,
        message: "User successfully updated",
        user,
      });
      return;
    }

    res.status(404).json({
      status: 404,
      message: "User not found",
    });
  } catch (err) {
    res.json(err);
    res.status(500).json({
      status: 500,
      message: "Error updating user",
    });
  }
});

export default userRouter;
