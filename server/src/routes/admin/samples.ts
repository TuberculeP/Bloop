import { Router } from "express";
import pg from "../../config/db.config";
import { SamplePack } from "../../config/entities/SamplePack";
import { SampleFolder } from "../../config/entities/SampleFolder";
import { AudioSample } from "../../config/entities/AudioSample";
import { deleteFromR2 } from "../../services/r2.service";

const adminSamplesRouter = Router();

// ===== SAMPLE PACKS =====

// GET /api/admin/samples/packs - List all packs (including inactive)
adminSamplesRouter.get("/packs", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const repo = pg.getRepository(SamplePack);
    const [packs, total] = await repo.findAndCount({
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      body: {
        packs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Error fetching packs:", error);
    res.status(500).json({ error: "Error fetching packs" });
  }
});

// GET /api/admin/samples/packs/:id - Get single pack with folders
adminSamplesRouter.get("/packs/:id", async (req, res) => {
  try {
    const repo = pg.getRepository(SamplePack);
    const pack = await repo.findOne({
      where: { id: req.params.id },
      relations: ["folders"],
      order: { folders: { order: "ASC" } },
    });

    if (!pack) {
      res.status(404).json({ error: "Pack not found" });
      return;
    }

    res.json({ body: pack });
  } catch (error) {
    console.error("Error fetching pack:", error);
    res.status(500).json({ error: "Error fetching pack" });
  }
});

// POST /api/admin/samples/packs - Create pack
adminSamplesRouter.post("/packs", async (req, res) => {
  try {
    const { name, slug, author, cover, featured } = req.body;

    if (!name || !slug) {
      res.status(400).json({ error: "Name and slug required" });
      return;
    }

    const repo = pg.getRepository(SamplePack);

    // Check if slug already exists
    const existing = await repo.findOne({ where: { slug } });
    if (existing) {
      res.status(400).json({ error: "Slug already exists" });
      return;
    }

    const pack = repo.create({
      name,
      slug,
      author: author ?? null,
      cover: cover ?? null,
      featured: featured ?? false,
    });
    const saved = await repo.save(pack);

    res.status(201).json({ body: saved });
  } catch (error) {
    console.error("Error creating pack:", error);
    res.status(500).json({ error: "Error creating pack" });
  }
});

// PUT /api/admin/samples/packs/:id - Update pack
adminSamplesRouter.put("/packs/:id", async (req, res) => {
  try {
    const { name, slug, author, cover, featured, isActive } = req.body;
    const repo = pg.getRepository(SamplePack);

    const pack = await repo.findOne({ where: { id: req.params.id } });
    if (!pack) {
      res.status(404).json({ error: "Pack not found" });
      return;
    }

    // Check slug uniqueness if changed
    if (slug && slug !== pack.slug) {
      const existing = await repo.findOne({ where: { slug } });
      if (existing) {
        res.status(400).json({ error: "Slug already exists" });
        return;
      }
      pack.slug = slug;
    }

    if (name !== undefined) pack.name = name;
    if (author !== undefined) pack.author = author;
    if (cover !== undefined) pack.cover = cover;
    if (featured !== undefined) pack.featured = featured;
    if (isActive !== undefined) pack.isActive = isActive;

    await repo.save(pack);

    res.json({ body: pack });
  } catch (error) {
    console.error("Error updating pack:", error);
    res.status(500).json({ error: "Error updating pack" });
  }
});

// DELETE /api/admin/samples/packs/:id - Delete pack (cascade)
adminSamplesRouter.delete("/packs/:id", async (req, res) => {
  try {
    const repo = pg.getRepository(SamplePack);
    const pack = await repo.findOne({ where: { id: req.params.id } });

    if (!pack) {
      res.status(404).json({ error: "Pack not found" });
      return;
    }

    await repo.remove(pack);

    res.json({ message: "Pack deleted" });
  } catch (error) {
    console.error("Error deleting pack:", error);
    res.status(500).json({ error: "Error deleting pack" });
  }
});

// ===== SAMPLE FOLDERS =====

// GET /api/admin/samples/packs/:packId/folders - List folders in pack
adminSamplesRouter.get("/packs/:packId/folders", async (req, res) => {
  try {
    const repo = pg.getRepository(SampleFolder);
    const folders = await repo.find({
      where: { packId: req.params.packId },
      order: { order: "ASC" },
    });

    res.json({ body: folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ error: "Error fetching folders" });
  }
});

// POST /api/admin/samples/packs/:packId/folders - Create folder
adminSamplesRouter.post("/packs/:packId/folders", async (req, res) => {
  try {
    const { name, order } = req.body;

    if (!name) {
      res.status(400).json({ error: "Name required" });
      return;
    }

    // Verify pack exists
    const packRepo = pg.getRepository(SamplePack);
    const pack = await packRepo.findOne({ where: { id: req.params.packId } });
    if (!pack) {
      res.status(404).json({ error: "Pack not found" });
      return;
    }

    const repo = pg.getRepository(SampleFolder);

    // Get max order if not provided
    let folderOrder = order;
    if (folderOrder === undefined) {
      const maxFolder = await repo.findOne({
        where: { packId: req.params.packId },
        order: { order: "DESC" },
      });
      folderOrder = maxFolder ? maxFolder.order + 1 : 0;
    }

    const folder = repo.create({
      name,
      order: folderOrder,
      packId: req.params.packId,
    });
    const saved = await repo.save(folder);

    res.status(201).json({ body: saved });
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ error: "Error creating folder" });
  }
});

// PUT /api/admin/samples/folders/:id - Update folder
adminSamplesRouter.put("/folders/:id", async (req, res) => {
  try {
    const { name, order } = req.body;
    const repo = pg.getRepository(SampleFolder);

    const folder = await repo.findOne({ where: { id: req.params.id } });
    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    if (name !== undefined) folder.name = name;
    if (order !== undefined) folder.order = order;

    await repo.save(folder);

    res.json({ body: folder });
  } catch (error) {
    console.error("Error updating folder:", error);
    res.status(500).json({ error: "Error updating folder" });
  }
});

// DELETE /api/admin/samples/folders/:id - Delete folder (cascade)
adminSamplesRouter.delete("/folders/:id", async (req, res) => {
  try {
    const repo = pg.getRepository(SampleFolder);
    const folder = await repo.findOne({ where: { id: req.params.id } });

    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    await repo.remove(folder);

    res.json({ message: "Folder deleted" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ error: "Error deleting folder" });
  }
});

// ===== AUDIO SAMPLES =====

// GET /api/admin/samples/folders/:folderId/samples - List samples in folder
adminSamplesRouter.get("/folders/:folderId/samples", async (req, res) => {
  try {
    const repo = pg.getRepository(AudioSample);
    const samples = await repo.find({
      where: { folderId: req.params.folderId },
      order: { name: "ASC" },
    });

    res.json({ body: samples });
  } catch (error) {
    console.error("Error fetching samples:", error);
    res.status(500).json({ error: "Error fetching samples" });
  }
});

// POST /api/admin/samples/folders/:folderId/samples - Create sample (after upload)
adminSamplesRouter.post("/folders/:folderId/samples", async (req, res) => {
  try {
    const { name, filename, duration, previewUrl, fullUrl } = req.body;

    if (!name || !filename) {
      res.status(400).json({ error: "Name and filename required" });
      return;
    }

    // Verify folder exists
    const folderRepo = pg.getRepository(SampleFolder);
    const folder = await folderRepo.findOne({
      where: { id: req.params.folderId },
    });
    if (!folder) {
      res.status(404).json({ error: "Folder not found" });
      return;
    }

    const repo = pg.getRepository(AudioSample);
    const sample = repo.create({
      name,
      filename,
      duration: duration ?? 0,
      folderId: req.params.folderId,
      previewUrl: previewUrl ?? null,
      fullUrl: fullUrl ?? null,
    });

    const saved = await repo.save(sample);

    res.status(201).json({ body: saved });
  } catch (error) {
    console.error("Error creating sample:", error);
    res.status(500).json({ error: "Error creating sample" });
  }
});

// PUT /api/admin/samples/samples/:id - Update sample
adminSamplesRouter.put("/samples/:id", async (req, res) => {
  try {
    const { name, duration, previewUrl, fullUrl } = req.body;
    const repo = pg.getRepository(AudioSample);

    const sample = await repo.findOne({ where: { id: req.params.id } });
    if (!sample) {
      res.status(404).json({ error: "Sample not found" });
      return;
    }

    if (name !== undefined) sample.name = name;
    if (duration !== undefined) sample.duration = duration;
    if (previewUrl !== undefined) sample.previewUrl = previewUrl;
    if (fullUrl !== undefined) sample.fullUrl = fullUrl;

    await repo.save(sample);

    res.json({ body: sample });
  } catch (error) {
    console.error("Error updating sample:", error);
    res.status(500).json({ error: "Error updating sample" });
  }
});

// DELETE /api/admin/samples/samples/:id - Delete sample (+ delete from R2)
adminSamplesRouter.delete("/samples/:id", async (req, res) => {
  try {
    const repo = pg.getRepository(AudioSample);
    const sample = await repo.findOne({ where: { id: req.params.id } });

    if (!sample) {
      res.status(404).json({ error: "Sample not found" });
      return;
    }

    // Try to delete from R2 if URL exists
    if (sample.fullUrl) {
      try {
        const key = sample.fullUrl.split("/").slice(-3).join("/");
        await deleteFromR2(key);
      } catch (r2Error) {
        console.warn("Could not delete from R2:", r2Error);
      }
    }

    await repo.remove(sample);

    res.json({ message: "Sample deleted" });
  } catch (error) {
    console.error("Error deleting sample:", error);
    res.status(500).json({ error: "Error deleting sample" });
  }
});

export default adminSamplesRouter;
