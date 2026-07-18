import { Router } from "express";
import { isAuth, isAdmin } from "../../middleware/auth.middleware";
import adminUsersRouter from "./users";
import adminSamplesRouter from "./samples";
import adminUploadRouter from "./upload";
import importPackRouter from "./import-pack";
import adminProjectsRouter from "./projects";
import pg from "../../config/db.config";
import { User } from "../../config/entities/User";
import { SamplePack } from "../../config/entities/SamplePack";
import { AudioSample } from "../../config/entities/AudioSample";

const adminRouter = Router();

// Apply auth + admin middleware to all admin routes
adminRouter.use(isAuth, isAdmin);

adminRouter.use("/users", adminUsersRouter);
adminRouter.use("/samples", adminSamplesRouter);
adminRouter.use("/upload", adminUploadRouter);
adminRouter.use("/import-pack", importPackRouter);
adminRouter.use("/projects", adminProjectsRouter);

// GET /api/admin/stats - Dashboard stats
adminRouter.get("/stats", async (_, res) => {
  try {
    const totalUsers = await pg.getRepository(User).count();
    const totalPacks = await pg.getRepository(SamplePack).count();
    const totalSamples = await pg.getRepository(AudioSample).count();

    res.json({
      body: {
        totalUsers,
        totalPacks,
        totalSamples,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Error fetching stats" });
  }
});

export default adminRouter;
