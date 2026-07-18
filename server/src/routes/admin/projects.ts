import { Router } from "express";
import multer from "multer";
import pg from "../../config/db.config";
import { Project } from "../../config/entities/Project";
import { User } from "../../config/entities/User";
import { syncSampleLinksForProject } from "../../services/sampleProjectLinks.service";
import { sanitizeFilename } from "../../utils/sanitize";

const adminProjectsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// GET /api/admin/projects - Liste paginée (recherche par nom de projet ou email owner)
adminProjectsRouter.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;

    const query = pg
      .getRepository(Project)
      .createQueryBuilder("project")
      .leftJoinAndSelect("project.user", "user")
      .where("project.deletedAt IS NULL")
      .orderBy("project.updatedAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.andWhere(
        "(LOWER(project.name) LIKE :search OR LOWER(user.email) LIKE :search)",
        { search: `%${search.toLowerCase()}%` },
      );
    }

    const [projects, total] = await query.getManyAndCount();

    const body = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      isPublic: p.isPublic,
      owner: {
        id: p.user.id,
        email: p.user.email,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
      },
    }));

    res.json({
      body: {
        projects: body,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error("Error fetching admin projects:", error);
    res.status(500).json({ error: "Error fetching projects" });
  }
});

// GET /api/admin/projects/:id/export - Export brut d'un projet (téléchargement JSON)
adminProjectsRouter.get("/:id/export", async (req, res) => {
  try {
    const project = await pg.getRepository(Project).findOne({
      where: { id: req.params.id },
      relations: ["user"],
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const exportPayload = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      sourceProjectId: project.id,
      sourceOwnerEmail: project.user.email,
      name: project.name,
      description: project.description ?? null,
      data: project.data,
      mcpEnabled: project.mcpEnabled,
      isPublic: project.isPublic,
    };

    const filename = `project-${sanitizeFilename(project.name)}-${project.id}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(exportPayload, null, 2));
  } catch (error) {
    console.error("Error exporting project:", error);
    res.status(500).json({ error: "Error exporting project" });
  }
});

// POST /api/admin/projects/import - Recrée un projet à partir d'un export brut
adminProjectsRouter.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const { ownerId } = req.body;
    if (!ownerId) {
      res.status(400).json({ error: "ownerId is required" });
      return;
    }

    let payload: any;
    try {
      payload = JSON.parse(req.file.buffer.toString("utf-8"));
    } catch {
      res.status(400).json({ error: "Invalid JSON file" });
      return;
    }

    if (!payload?.name || payload?.data === undefined) {
      res
        .status(400)
        .json({ error: "Invalid export file: missing name or data" });
      return;
    }

    const owner = await pg
      .getRepository(User)
      .findOne({ where: { id: ownerId } });
    if (!owner) {
      res.status(404).json({ error: "Owner not found" });
      return;
    }

    const projectRepository = pg.getRepository(Project);
    const project = projectRepository.create({
      name: payload.name,
      description: payload.description ?? undefined,
      data: payload.data,
      user: owner,
      mcpEnabled: false,
      isPublic: false,
    });

    const saved = await projectRepository.save(project);
    await syncSampleLinksForProject(saved.id, saved.data?.data);

    res.status(201).json({
      body: {
        id: saved.id,
        name: saved.name,
        owner: { id: owner.id, email: owner.email },
        createdAt: saved.createdAt,
      },
    });
  } catch (error) {
    console.error("Error importing project:", error);
    res.status(500).json({ error: "Error importing project" });
  }
});

export default adminProjectsRouter;
