import { Router } from "express";
import pg from "../../config/db.config";
import { Post } from "../../config/entities/Post";
import { User } from "../../config/entities/User";
import { Tag } from "../../config/entities/Tag";
import { IsNull } from "typeorm";

const postsRouter = Router();

postsRouter.post("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "Login required to create a post",
      });
      return;
    }

    const postRepository = pg.getRepository(Post);
    const { body, tags, is_highlight, pinned_by_user, comment_of_post_id } =
      req.body;

    if (!body) {
      res.status(422).json({
        status: 422,
        message: "Missing data",
      });
    }

    const userRepository = pg.getRepository(User);
    const author = await userRepository.findOneBy({ id: req.user.id });

    let tagsArray: Tag[] = [];
    const tagRepository = pg.getRepository(Tag);

    // Supporter les tags par nom (string) ou par ID
    if (tags && Array.isArray(tags)) {
      for (let tagInput of tags) {
        let tag: Tag | null = null;

        // Si c'est un UUID, chercher par ID
        if (
          typeof tagInput === "string" &&
          tagInput.match(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          )
        ) {
          tag = await tagRepository.findOneBy({ id: tagInput });
        }

        // Sinon, chercher par nom
        if (!tag && typeof tagInput === "string") {
          tag = await tagRepository.findOneBy({ name: tagInput });

          // Si le tag n'existe pas, le créer
          if (!tag) {
            const newTag = tagRepository.create({ name: tagInput });
            tag = await tagRepository.save(newTag);
          }
        }

        if (tag) tagsArray.push(tag);
      }
    }

    let payload: any = {
      author: author,
      body: body,
      tags: tagsArray,
      is_highlight: is_highlight,
      pinned_by_user: pinned_by_user,
    };

    if (comment_of_post_id) {
      const postComment = await postRepository.findOne({
        where: { id: comment_of_post_id },
        relations: ["author"],
      });

      if (!postComment) {
        res.status(404).json({
          status: 404,
          message: "Post not found",
        });
      }

      payload.comment_of = postComment;
    }

    const newPost = postRepository.create(payload);
    await postRepository.save(newPost);

    res.status(201).json({
      status: 201,
      message: "Post successfully created",
      body: newPost,
    });
    return;
  } catch (err) {
    res.json(err);
  }
});

postsRouter.get("/", async (req, res) => {
  try {
    const postRepository = pg.getRepository(Post);
    let allPosts = await postRepository.find({
      where: { comment_of: IsNull(), isActive: true },
      order: { createdAt: "DESC" },
      relations: ["author", "tags", "comments", "likedBy"],
    });

    const postsWithCounts = allPosts.map((post) => {
      const { likedBy, comments, ...rest } = post;
      let isLikedByMe = false;

      if (req.isAuthenticated()) {
        isLikedByMe = post?.likedBy?.some((user) => user.id === req.user.id);
      }

      return {
        ...rest,
        likesCount: likedBy?.length ?? 0,
        commentsCount: comments?.length ?? 0,
        isLikedByMe: isLikedByMe,
      };
    });

    res.status(200).json({
      status: 200,
      message: "Posts successfully retrieved",
      body: postsWithCounts,
    });
    return;
  } catch (err) {
    res.json(err);
  }
});

postsRouter.get("/:id", async (req, res) => {
  try {
    const postRepository = pg.getRepository(Post);
    let post = await postRepository.findOne({
      where: { id: req.params.id },
      relations: ["author", "tags", "likedBy", "comments", "comments.author"],
      order: { comments: { createdAt: "DESC" } },
    });

    if (!post) {
      res.status(404).json({
        status: 404,
        message: "Post not found",
      });
      return;
    }

    const { likedBy, ...rest } = post;
    let postWithLikeCount = {
      ...rest,
      like: likedBy?.length || 0,
    };

    res.status(200).json({
      status: 200,
      message: "Post successfully retrieved",
      body: postWithLikeCount,
    });
    return;
  } catch (err) {
    res.json(err);
  }
});

postsRouter.patch("/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "User not log",
      });
      return;
    }

    const postRepository = pg.getRepository(Post);
    const { tags } = req.body;
    let updates = req.body;

    const post = await postRepository.findOne({
      where: { id: req.params.id },
      relations: ["author"],
    });

    if (post && post.author.id !== req.user.id) {
      res.status(401).json({
        status: 401,
        message: "Not the author of the post",
      });
      return;
    }

    if (tags && tags.length > 0) {
      const tagRepository = pg.getRepository(Tag);
      let newTagsArray = [];
      for (let tagId of tags) {
        let tag = await tagRepository.findOneBy({ id: tagId });
        newTagsArray.push(tag);
      }

      updates.tags = newTagsArray;
    }

    if (post) {
      const postUpdated = await postRepository.save({ ...post, ...updates });
      res.status(200).json({
        status: 200,
        message: "Post successfully updated",
        body: postUpdated,
      });
      return;
    }

    res.status(404).json({
      status: 404,
      message: "Post not found",
    });
    return;
  } catch (err) {
    res.json(err);
  }
});

postsRouter.delete("/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "User not log",
      });
      return;
    }

    const postRepository = pg.getRepository(Post);
    const post = await postRepository.findOne({
      where: { id: req.params.id },
      relations: ["author", "tags"],
    });

    if (post && post.author.id !== req.user.id) {
      res.status(401).json({
        status: 401,
        message: "Not the author of the post",
      });
      return;
    }

    if (post) {
      await postRepository.delete(req.params.id);

      res.status(204).json({
        status: 204,
        message: "Post successfully deleted",
      });
      return;
    }

    res.status(404).json({
      status: 404,
      message: "Post not found",
    });
    return;
  } catch (err) {
    res.json(err);
  }
});

postsRouter.patch("/like/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "Login required to like a post",
      });
      return;
    }

    const postRepository = pg.getRepository(Post);
    const userRepository = pg.getRepository(User);

    const author = await userRepository.findOne({
      where: { id: req.user.id },
      relations: ["likedPosts"],
    });
    const post = await postRepository.findOneBy({ id: req.params.id });

    if (post && author) {
      const hasLiked = author.likedPosts.some((p) => p.id === post.id);

      if (hasLiked) {
        author.likedPosts = author.likedPosts.filter((p) => p.id !== post.id);
      } else {
        author.likedPosts.push(post);
      }

      await userRepository.save(author);

      res.status(200).json({
        status: 200,
        message: hasLiked
          ? "Post successfully unliked"
          : "Post successfully liked",
        body: post,
      });
    }
  } catch (err) {
    res.json(err);
  }
});

export default postsRouter;
