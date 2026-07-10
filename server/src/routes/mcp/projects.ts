import { Router } from "express";
import pg from "../../config/db.config";
import { Project } from "../../config/entities/Project";
import { User } from "../../config/entities/User";
import { bearerAuth } from "../../middleware/auth.middleware";
import { syncSampleLinksForProject } from "../../services/sampleProjectLinks.service";

const mcpProjectsRouter = Router();

mcpProjectsRouter.get("/", bearerAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const projectRepository = pg.getRepository(Project);

    const projects = await projectRepository.find({
      where: { user: { id: user.id }, mcpEnabled: true },
      select: ["id", "name", "description", "createdAt", "updatedAt"],
      order: { updatedAt: "DESC" },
    });

    res.json({ body: projects });
  } catch (error) {
    console.error("Error fetching MCP projects:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

mcpProjectsRouter.get("/:id", bearerAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const projectRepository = pg.getRepository(Project);

    const project = await projectRepository.findOne({
      where: { id: req.params.id, user: { id: user.id } },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    if (!project.mcpEnabled) {
      res
        .status(403)
        .json({ error: "MCP access not enabled for this project" });
      return;
    }

    res.json({
      body: {
        id: project.id,
        name: project.name,
        description: project.description,
        data: project.data,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching MCP project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

mcpProjectsRouter.post("/", bearerAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const { name, data } = req.body;

    if (!name || !data) {
      res.status(400).json({ error: "Name and data are required" });
      return;
    }

    const projectRepository = pg.getRepository(Project);

    const project = projectRepository.create({
      name,
      data,
      user,
      mcpEnabled: true,
    });

    const savedProject = await projectRepository.save(project);
    await syncSampleLinksForProject(savedProject.id, savedProject.data?.data);

    res.status(201).json({
      body: {
        id: savedProject.id,
        name: savedProject.name,
        createdAt: savedProject.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating MCP project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

mcpProjectsRouter.put("/:id", bearerAuth, async (req, res) => {
  try {
    const user = req.user as User;
    const { name, data } = req.body;
    const projectRepository = pg.getRepository(Project);

    const project = await projectRepository.findOne({
      where: { id: req.params.id, user: { id: user.id } },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    if (!project.mcpEnabled) {
      res
        .status(403)
        .json({ error: "MCP access not enabled for this project" });
      return;
    }

    if (name !== undefined) project.name = name;
    if (data !== undefined) project.data = data;

    const savedProject = await projectRepository.save(project);

    if (data !== undefined) {
      await syncSampleLinksForProject(savedProject.id, savedProject.data?.data);
    }

    res.json({
      body: {
        id: savedProject.id,
        name: savedProject.name,
        updatedAt: savedProject.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating MCP project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default mcpProjectsRouter;
