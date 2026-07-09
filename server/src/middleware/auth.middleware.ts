import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import pg from "../config/db.config";
import { OAuthToken } from "../config/entities/OAuthToken";

export const isAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "ROLE_ADMIN") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};

export const bearerAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .set(
          "WWW-Authenticate",
          `Bearer resource_metadata="${req.protocol}://${req.get("host")}/.well-known/oauth-protected-resource"`,
        )
        .json({ error: "Bearer token required" });
      return;
    }

    const rawToken = authHeader.slice(7);
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const tokenRepository = pg.getRepository(OAuthToken);
    const token = await tokenRepository.findOne({
      where: { accessTokenHash: tokenHash },
      relations: ["user"],
    });

    if (!token) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    if (token.expiresAt && token.expiresAt < new Date()) {
      res.status(401).json({ error: "Token expired" });
      return;
    }

    req.user = token.user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
