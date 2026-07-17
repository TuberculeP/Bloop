import { Router } from "express";
import pg from "../../config/db.config";
import { LearningArticle } from "../../config/entities/LearningArticle";
import { LearningArticleVote } from "../../config/entities/LearningArticleVote";
import { isAuth, isAdmin } from "../../middleware/auth.middleware";
import learningUploadRouter from "./upload";

const learningRouter = Router();

learningRouter.use("/upload-image", isAuth, isAdmin, learningUploadRouter);

function computeScore(votes: { value: number }[] = []): number {
  return votes.reduce((sum, vote) => sum + vote.value, 0);
}

function serializeArticle(article: LearningArticle, myVote: number) {
  const { votes, ...rest } = article;
  return { ...rest, score: computeScore(votes), myVote };
}

function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const articleRepository = pg.getRepository(LearningArticle);
  let slug = base;
  let suffix = 2;

  while (true) {
    const existing = await articleRepository.findOne({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${suffix}`;
    suffix++;
  }
}

// GET /api/learning
learningRouter.get("/", async (req, res) => {
  try {
    const articleRepository = pg.getRepository(LearningArticle);
    const articles = await articleRepository.find({
      where: { status: "published" },
      relations: ["author", "votes"],
    });

    const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : "";
    const filtered = q
      ? articles.filter(
          (article) =>
            article.title.toLowerCase().includes(q) ||
            article.excerpt?.toLowerCase().includes(q),
        )
      : articles;

    let myVotes = new Map<string, number>();
    if (req.isAuthenticated()) {
      const voteRepository = pg.getRepository(LearningArticleVote);
      const ownVotes = await voteRepository.find({
        where: { user: { id: req.user.id } },
        relations: ["article"],
      });
      myVotes = new Map(ownVotes.map((vote) => [vote.article.id, vote.value]));
    }

    const withMeta = filtered.map((article) =>
      serializeArticle(article, myVotes.get(article.id) || 0),
    );

    const sorted =
      req.query.sort === "votes"
        ? withMeta.sort((a, b) => b.score - a.score)
        : withMeta.sort(
            (a, b) =>
              new Date(b.publishedAt).getTime() -
              new Date(a.publishedAt).getTime(),
          );

    res.status(200).json({
      status: 200,
      message: "Articles successfully retrieved",
      body: sorted,
    });
  } catch (err) {
    res.json(err);
  }
});

// GET /api/learning/mine
learningRouter.get("/mine", isAuth, async (req, res) => {
  try {
    // isAuth bloque déjà les non-authentifiés, mais TypeScript ne peut pas
    // narrower req.user across un autre middleware : ce guard est nécessaire
    // pour la vérification de type de req.user.id ci-dessous.
    if (!req.isAuthenticated()) {
      res.status(401).json({ status: 401, message: "Login required" });
      return;
    }

    const articleRepository = pg.getRepository(LearningArticle);
    const articles = await articleRepository.find({
      where: { author: { id: req.user.id } },
      order: { updatedAt: "DESC" },
      relations: ["author"],
    });

    res.status(200).json({
      status: 200,
      message: "Articles successfully retrieved",
      body: articles,
    });
  } catch (err) {
    res.json(err);
  }
});

// GET /api/learning/:idOrSlug
learningRouter.get("/:idOrSlug", async (req, res) => {
  try {
    const articleRepository = pg.getRepository(LearningArticle);
    const article = await articleRepository.findOne({
      where: [{ slug: req.params.idOrSlug }, { id: req.params.idOrSlug }],
      relations: ["author", "votes"],
    });

    if (!article) {
      res.status(404).json({ status: 404, message: "Article not found" });
      return;
    }

    const isAdminUser =
      req.isAuthenticated() && req.user?.role === "ROLE_ADMIN";
    if (article.status !== "published" && !isAdminUser) {
      res.status(404).json({ status: 404, message: "Article not found" });
      return;
    }

    let myVote = 0;
    if (req.isAuthenticated()) {
      const voteRepository = pg.getRepository(LearningArticleVote);
      const ownVote = await voteRepository.findOne({
        where: { article: { id: article.id }, user: { id: req.user.id } },
      });
      myVote = ownVote?.value || 0;
    }

    res.status(200).json({
      status: 200,
      message: "Article successfully retrieved",
      body: serializeArticle(article, myVote),
    });
  } catch (err) {
    res.json(err);
  }
});

// POST /api/learning/:id/vote
learningRouter.post("/:id/vote", isAuth, async (req, res) => {
  try {
    // isAuth bloque déjà les non-authentifiés ; ce guard sert au narrowing
    // TypeScript de req.user utilisé plus bas (existingVote, req.user.id).
    if (!req.isAuthenticated()) {
      res.status(401).json({ status: 401, message: "Login required" });
      return;
    }

    const value = Number(req.body.value);
    if (value !== 1 && value !== -1) {
      res.status(422).json({ status: 422, message: "value must be 1 or -1" });
      return;
    }

    const articleRepository = pg.getRepository(LearningArticle);
    const article = await articleRepository.findOne({
      where: { id: req.params.id as string },
    });

    if (!article) {
      res.status(404).json({ status: 404, message: "Article not found" });
      return;
    }

    const voteRepository = pg.getRepository(LearningArticleVote);
    const existingVote = await voteRepository.findOne({
      where: { article: { id: article.id }, user: { id: req.user.id } },
    });

    let myVote = value;

    if (existingVote && existingVote.value === value) {
      await voteRepository.delete(existingVote.id);
      myVote = 0;
    } else if (existingVote) {
      existingVote.value = value;
      await voteRepository.save(existingVote);
    } else {
      const newVote = voteRepository.create({ article, user: req.user, value });
      await voteRepository.save(newVote);
    }

    const score =
      (await voteRepository.sum("value", { article: { id: article.id } })) || 0;

    res.status(200).json({
      status: 200,
      message: "Vote updated",
      body: { score, myVote },
    });
  } catch (err) {
    res.json(err);
  }
});

// POST /api/learning
learningRouter.post("/", isAuth, isAdmin, async (req, res) => {
  try {
    const { title, body, excerpt, coverImage, status } = req.body;

    if (!title || !body) {
      res.status(422).json({ status: 422, message: "Missing data" });
      return;
    }

    const articleRepository = pg.getRepository(LearningArticle);
    const slug = await uniqueSlug(slugify(title));
    const resolvedStatus = status === "published" ? "published" : "draft";

    const newArticle = articleRepository.create({
      title,
      slug,
      body,
      excerpt,
      coverImage,
      status: resolvedStatus,
      author: req.user,
      publishedAt: resolvedStatus === "published" ? new Date() : undefined,
    });

    await articleRepository.save(newArticle);

    res.status(201).json({
      status: 201,
      message: "Article successfully created",
      body: newArticle,
    });
  } catch (err) {
    res.json(err);
  }
});

// PATCH /api/learning/:id
learningRouter.patch("/:id", isAuth, isAdmin, async (req, res) => {
  try {
    const articleRepository = pg.getRepository(LearningArticle);
    const article = await articleRepository.findOne({
      where: { id: req.params.id as string },
      relations: ["author"],
    });

    if (!article) {
      res.status(404).json({ status: 404, message: "Article not found" });
      return;
    }

    const { title, body, excerpt, coverImage, status } = req.body;

    if (title && title !== article.title) {
      article.title = title;
      article.slug = await uniqueSlug(slugify(title), article.id);
    }
    if (body !== undefined) article.body = body;
    if (excerpt !== undefined) article.excerpt = excerpt;
    if (coverImage !== undefined) article.coverImage = coverImage;

    if (status && status !== article.status) {
      article.status = status;
      if (status === "published" && !article.publishedAt) {
        article.publishedAt = new Date();
      }
    }

    const updated = await articleRepository.save(article);

    res.status(200).json({
      status: 200,
      message: "Article successfully updated",
      body: updated,
    });
  } catch (err) {
    res.json(err);
  }
});

// DELETE /api/learning/:id
learningRouter.delete("/:id", isAuth, isAdmin, async (req, res) => {
  try {
    const articleRepository = pg.getRepository(LearningArticle);
    const article = await articleRepository.findOne({
      where: { id: req.params.id as string },
    });

    if (!article) {
      res.status(404).json({ status: 404, message: "Article not found" });
      return;
    }

    await articleRepository.delete(req.params.id as string);

    res.status(204).json({
      status: 204,
      message: "Article successfully deleted",
    });
  } catch (err) {
    res.json(err);
  }
});

export default learningRouter;
