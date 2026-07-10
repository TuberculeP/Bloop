import { Router } from "express";
import projectsRouter from "./projects";

const appRouter = Router();

appRouter.use("/projects", projectsRouter);

export default appRouter;
