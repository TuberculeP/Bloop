import { Router } from "express";
import projectsRouter from "./projects";
import recordingsRouter from "./recordings";

const appRouter = Router();

appRouter.use("/projects", projectsRouter);
appRouter.use("/recordings", recordingsRouter);

export default appRouter;
