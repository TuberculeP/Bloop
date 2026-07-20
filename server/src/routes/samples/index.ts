import { Router } from "express";
import pg from "../../config/db.config";
import { SamplePack } from "../../config/entities/SamplePack";
import { AudioSample } from "../../config/entities/AudioSample";

const samplesRouter = Router();

// GET /api/samples/packs - Liste paginée des packs
samplesRouter.get("/packs", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const featured = req.query.featured === "true";

    const repo = pg.getRepository(SamplePack);
    const query = repo
      .createQueryBuilder("pack")
      .where("pack.isActive = :active", { active: true })
      .orderBy("pack.featured", "DESC")
      .addOrderBy("pack.name", "ASC")
      .skip((page - 1) * limit)
      .take(limit);

    if (featured) {
      query.andWhere("pack.featured = :featured", { featured: true });
    }

    const [packs, total] = await query.getManyAndCount();

    res.status(200).json({
      status: 200,
      message: "Packs successfully retrieved",
      body: {
        packs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error("Error fetching packs:", err);
    res.status(500).json({ status: 500, message: "Error fetching packs" });
  }
});

// GET /api/samples/packs/:slug - Détails d'un pack avec folders
samplesRouter.get("/packs/:slug", async (req, res) => {
  try {
    const repo = pg.getRepository(SamplePack);
    const pack = await repo.findOne({
      where: { slug: req.params.slug, isActive: true },
      relations: ["folders"],
    });

    if (!pack) {
      res.status(404).json({
        status: 404,
        message: "Pack not found",
      });
      return;
    }

    pack.folders.sort((a, b) => a.order - b.order);

    res.status(200).json({
      status: 200,
      message: "Pack successfully retrieved",
      body: pack,
    });
  } catch (err) {
    console.error("Error fetching pack:", err);
    res.status(500).json({ status: 500, message: "Error fetching pack" });
  }
});

// GET /api/samples/packs/:slug/folders/:folderId - Samples d'un folder
samplesRouter.get("/packs/:slug/folders/:folderId", async (req, res) => {
  try {
    const repo = pg.getRepository(AudioSample);
    const samples = await repo.find({
      where: { folderId: req.params.folderId },
      order: { name: "ASC" },
    });

    res.status(200).json({
      status: 200,
      message: "Samples successfully retrieved",
      body: samples,
    });
  } catch (err) {
    console.error("Error fetching samples:", err);
    res.status(500).json({ status: 500, message: "Error fetching samples" });
  }
});

// GET /api/samples/search - Recherche full-text (paginée)
samplesRouter.get("/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) {
      res.status(400).json({
        status: 400,
        message: "Query too short (minimum 2 characters)",
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const repo = pg.getRepository(AudioSample);
    const [samples, total] = await repo
      .createQueryBuilder("sample")
      .leftJoinAndSelect("sample.folder", "folder")
      .leftJoinAndSelect("folder.pack", "pack")
      .where("LOWER(sample.name) LIKE :query", {
        query: `%${q.toLowerCase()}%`,
      })
      .orWhere("LOWER(pack.name) LIKE :query", {
        query: `%${q.toLowerCase()}%`,
      })
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    res.status(200).json({
      status: 200,
      message: "Search results retrieved",
      body: {
        samples,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error("Error searching samples:", err);
    res.status(500).json({ status: 500, message: "Error searching samples" });
  }
});

// GET /api/samples/:id - Détails d'un sample
samplesRouter.get("/:id", async (req, res) => {
  try {
    const repo = pg.getRepository(AudioSample);
    const sample = await repo.findOne({
      where: { id: req.params.id },
      relations: ["folder", "folder.pack"],
    });

    if (!sample) {
      res.status(404).json({
        status: 404,
        message: "Sample not found",
      });
      return;
    }

    res.status(200).json({
      status: 200,
      message: "Sample successfully retrieved",
      body: sample,
    });
  } catch (err) {
    console.error("Error fetching sample:", err);
    res.status(500).json({ status: 500, message: "Error fetching sample" });
  }
});

export default samplesRouter;
