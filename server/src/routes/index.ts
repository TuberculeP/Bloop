import { Router } from "express";
import pg from "../config/db.config";
import { Foo } from "../config/entities/Foo";
import authRouter from "./auth";
import postsRouter from "./network/posts";
import tagsRouter from "./network/tags";
import messagesRouter from "./network/messages";
import appRouter from "./app";
import samplesRouter from "./samples";
import adminRouter from "./admin";
import mcpProjectsRouter from "./mcp/projects";
import mcpOauthRouter from "./mcp/oauth";
import mcpSseRouter from "./mcp/sse";
import userRouter from "./user";
import learningRouter from "./learning";

const router = Router();

router.get("/health", (_, res) => {
  res.status(200).send("OK");
});

router.get("/", (_, res) => {
  const fooRepository = pg.getRepository(Foo);
  const foos = fooRepository.find();
  res.json({
    message: "Hello from the server!",
    foos,
  });
});

router.use("/auth", authRouter);
router.use("/posts", postsRouter);
router.use("/tags", tagsRouter);
router.use("/messages", messagesRouter);
router.use("/app", appRouter);
router.use("/samples", samplesRouter);
router.use("/admin", adminRouter);
router.use("/mcp/projects", mcpProjectsRouter);
router.use("/mcp/oauth", mcpOauthRouter);
router.use("/mcp/sse", mcpSseRouter);
router.use("/user", userRouter);
router.use("/learning", learningRouter);

export default router;
