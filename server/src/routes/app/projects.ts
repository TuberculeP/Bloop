import { Router } from "express";
import pg from "../../config/db.config";
import { IsNull, Not } from "typeorm";
import { Project } from "../../config/entities/Project";
import { ProjectFavorite } from "../../config/entities/ProjectFavorite";
import { syncSampleLinksForProject } from "../../services/sampleProjectLinks.service";

const projectsRouter = Router();

function findPublicProject(id: string) {
  return pg.getRepository(Project).findOne({
    where: { id, isPublic: true, deletedAt: IsNull() },
    relations: ["user"],
  });
}

projectsRouter.get("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const projectRepository = pg.getRepository(Project);
    const projects = await projectRepository.find({
      where: { user: { id: req.user.id }, deletedAt: IsNull() },
      select: [
        "id",
        "name",
        "description",
        "createdAt",
        "updatedAt",
        "mcpEnabled",
        "isPublic",
      ],
      order: { updatedAt: "DESC" },
    });

    res.json({ body: projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// NOTE: /public et /favorites doivent être avant /:id pour éviter le conflit de route Express
projectsRouter.get("/public", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const projectRepository = pg.getRepository(Project);
    const projects = await projectRepository.find({
      where: { isPublic: true, deletedAt: IsNull() },
      relations: ["user"],
      order: { updatedAt: "DESC" },
    });

    const body = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      isPublic: p.isPublic,
      owner: {
        id: p.user.id,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
      },
    }));

    res.json({ body });
  } catch (error) {
    console.error("Error fetching public projects:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.get("/favorites", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const favoriteRepository = pg.getRepository(ProjectFavorite);
    const favorites = await favoriteRepository.find({
      where: { user: { id: req.user.id } },
      relations: ["project", "project.user"],
      order: { createdAt: "DESC" },
    });

    const body = favorites
      .filter(
        (f) =>
          f.project.deletedAt === null &&
          (f.project.isPublic || f.project.user.id === req.user.id),
      )
      .map((f) => ({
        favoriteId: f.id,
        favoritedAt: f.createdAt,
        id: f.project.id,
        name: f.project.name,
        description: f.project.description,
        createdAt: f.project.createdAt,
        updatedAt: f.project.updatedAt,
        isPublic: f.project.isPublic,
        owner: {
          id: f.project.user.id,
          firstName: f.project.user.firstName,
          lastName: f.project.user.lastName,
        },
      }));

    res.json({ body });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.get("/trash", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const projectRepository = pg.getRepository(Project);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await projectRepository.find({
      where: { user: { id: req.user.id }, deletedAt: Not(IsNull()) },
      select: [
        "id",
        "name",
        "description",
        "createdAt",
        "updatedAt",
        "deletedAt",
      ],
      order: { deletedAt: "DESC" },
    });

    const body = deleted.filter(
      (p) => p.deletedAt !== null && new Date(p.deletedAt!) >= thirtyDaysAgo,
    );

    res.json({ body });
  } catch (error) {
    console.error("Error fetching trash:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.get("/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const projectRepository = pg.getRepository(Project);

    const ownProject = await projectRepository.findOne({
      where: {
        id: req.params.id,
        user: { id: req.user.id },
        deletedAt: IsNull(),
      },
    });

    if (ownProject) {
      res.json({ body: { ...ownProject, isOwned: true } });
      return;
    }

    const publicProject = await findPublicProject(req.params.id);

    if (publicProject) {
      res.json({
        body: {
          ...publicProject,
          isOwned: false,
          owner: {
            id: publicProject.user.id,
            firstName: publicProject.user.firstName,
            lastName: publicProject.user.lastName,
          },
        },
      });
      return;
    }

    res.status(404).json({ error: "Project not found" });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Aperçu léger d'un projet pour l'enrichissement des liens dans le blog.
// Volontairement limité aux projets publics : un projet privé ou introuvable
// renvoie 404, peu importe qui fait la requête.
projectsRouter.get("/:id/link-preview", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const project = await findPublicProject(req.params.id);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json({
      body: {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        owner: {
          firstName: project.user.firstName,
          lastName: project.user.lastName,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching project link preview:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.post("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { name, description, data } = req.body;

    if (!name || !data) {
      res.status(400).json({ error: "Name and data are required" });
      return;
    }

    const projectRepository = pg.getRepository(Project);

    const project = projectRepository.create({
      name,
      description,
      data,
      user: req.user,
    });

    const savedProject = await projectRepository.save(project);
    await syncSampleLinksForProject(savedProject.id, savedProject.data?.data);

    res.status(201).json({
      body: {
        id: savedProject.id,
        name: savedProject.name,
        description: savedProject.description,
        createdAt: savedProject.createdAt,
        updatedAt: savedProject.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.put("/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { name, description, data } = req.body;
    const projectRepository = pg.getRepository(Project);

    const project = await projectRepository.findOne({
      where: {
        id: req.params.id,
        user: { id: req.user.id },
        deletedAt: IsNull(),
      },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (data !== undefined) project.data = data;

    const savedProject = await projectRepository.save(project);

    if (data !== undefined) {
      await syncSampleLinksForProject(savedProject.id, savedProject.data?.data);
    }

    res.json({
      body: {
        id: savedProject.id,
        name: savedProject.name,
        description: savedProject.description,
        createdAt: savedProject.createdAt,
        updatedAt: savedProject.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.delete("/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const projectRepository = pg.getRepository(Project);

    const project = await projectRepository.findOne({
      where: {
        id: req.params.id,
        user: { id: req.user.id },
        deletedAt: IsNull(),
      },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    project.deletedAt = new Date();
    await projectRepository.save(project);

    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.patch("/:id/mcp", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { mcpEnabled } = req.body;
    const projectRepository = pg.getRepository(Project);

    const project = await projectRepository.findOne({
      where: {
        id: req.params.id,
        user: { id: req.user.id },
        deletedAt: IsNull(),
      },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    project.mcpEnabled = mcpEnabled;
    const savedProject = await projectRepository.save(project);

    res.json({
      body: {
        id: savedProject.id,
        name: savedProject.name,
        mcpEnabled: savedProject.mcpEnabled,
      },
    });
  } catch (error) {
    console.error("Error updating project MCP status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.patch("/:id/visibility", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { isPublic } = req.body;
    const projectRepository = pg.getRepository(Project);

    const project = await projectRepository.findOne({
      where: {
        id: req.params.id,
        user: { id: req.user.id },
        deletedAt: IsNull(),
      },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    project.isPublic = isPublic;
    const savedProject = await projectRepository.save(project);

    res.json({
      body: {
        id: savedProject.id,
        name: savedProject.name,
        isPublic: savedProject.isPublic,
      },
    });
  } catch (error) {
    console.error("Error updating project visibility:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.post("/:id/clone", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const projectRepository = pg.getRepository(Project);

    const source = await projectRepository.findOne({
      where: { id: req.params.id, deletedAt: IsNull() },
      relations: ["user"],
    });

    if (!source || (!source.isPublic && source.user.id !== req.user.id)) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const clone = projectRepository.create({
      name: `Copie de ${source.name}`,
      description: source.description,
      data: source.data,
      user: req.user,
      isPublic: false,
      mcpEnabled: false,
    });

    const saved = await projectRepository.save(clone);
    await syncSampleLinksForProject(saved.id, saved.data?.data);

    res.status(201).json({
      body: {
        id: saved.id,
        name: saved.name,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error cloning project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.post("/:id/favorite", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const projectRepository = pg.getRepository(Project);
    const favoriteRepository = pg.getRepository(ProjectFavorite);

    const project = await projectRepository.findOne({
      where: { id: req.params.id },
      relations: ["user"],
    });

    if (!project || (!project.isPublic && project.user.id !== req.user.id)) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const existing = await favoriteRepository.findOne({
      where: { user: { id: req.user.id }, project: { id: project.id } },
    });

    if (existing) {
      res.json({ body: { favoriteId: existing.id } });
      return;
    }

    const favorite = favoriteRepository.create({
      user: req.user,
      project,
    });
    const saved = await favoriteRepository.save(favorite);

    res.status(201).json({ body: { favoriteId: saved.id } });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.delete("/:id/favorite", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const favoriteRepository = pg.getRepository(ProjectFavorite);

    const favorite = await favoriteRepository.findOne({
      where: { user: { id: req.user.id }, project: { id: req.params.id } },
    });

    if (!favorite) {
      res.status(404).json({ error: "Favorite not found" });
      return;
    }

    await favoriteRepository.remove(favorite);

    res.json({ message: "Favorite removed" });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.patch("/:id/restore", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const projectRepository = pg.getRepository(Project);

    const project = await projectRepository.findOne({
      where: {
        id: req.params.id,
        user: { id: req.user.id },
        deletedAt: Not(IsNull()),
      },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found in trash" });
      return;
    }

    project.deletedAt = null;
    await projectRepository.save(project);

    res.json({ message: "Project restored successfully" });
  } catch (error) {
    console.error("Error restoring project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default projectsRouter;
