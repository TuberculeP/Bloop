import { Router } from "express";
import pg from "../../config/db.config";
import { Project } from "../../config/entities/Project";

const projectsRouter = Router();

projectsRouter.get("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const projectRepository = pg.getRepository(Project);
    const projects = await projectRepository.find({
      where: { user: { id: req.user.id } },
      select: ["id", "name", "description", "createdAt", "updatedAt"],
      order: { updatedAt: "DESC" },
    });

    res.json({ body: projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
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
    const project = await projectRepository.findOne({
      where: { id: req.params.id, user: { id: req.user.id } },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json({ body: project });
  } catch (error) {
    console.error("Error fetching project:", error);
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
      where: { id: req.params.id, user: { id: req.user.id } },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (data !== undefined) project.data = data;

    const savedProject = await projectRepository.save(project);

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
      where: { id: req.params.id, user: { id: req.user.id } },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    await projectRepository.remove(project);

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
      where: { id: req.params.id, user: { id: req.user.id } },
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

export default projectsRouter;
