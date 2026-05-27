import { Router } from "express";
import crypto from "crypto";
import pg from "../../config/db.config";
import { OAuthToken } from "../../config/entities/OAuthToken";
import { User } from "../../config/entities/User";

const oauthRouter = Router();

interface AuthCode {
  userId: string;
  codeChallenge: string;
  redirectUri: string;
  expiresAt: Date;
}

const authCodes = new Map<string, AuthCode>();

// Cleanup expired codes every 5 minutes
setInterval(
  () => {
    const now = new Date();
    for (const [code, data] of authCodes.entries()) {
      if (data.expiresAt < now) authCodes.delete(code);
    }
  },
  5 * 60 * 1000,
);

function generateToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function verifyPkce(verifier: string, challenge: string): boolean {
  const computed = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return computed === challenge;
}

// Dynamic client registration (required by MCP spec — RFC 7591)
oauthRouter.post("/register", (req, res) => {
  const {
    client_name = "Claude Code",
    redirect_uris = [],
    ...rest
  } = req.body || {};
  const clientId = crypto.randomBytes(16).toString("hex");
  res.status(201).json({
    client_id: clientId,
    client_name,
    redirect_uris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    ...rest,
  });
});

// Authorization endpoint
oauthRouter.get("/authorize", (req, res) => {
  if (!req.isAuthenticated()) {
    const redirect = encodeURIComponent(req.originalUrl);
    res.redirect(`/login?redirect=${redirect}`);
    return;
  }

  const { redirect_uri, state, code_challenge, code_challenge_method } =
    req.query as Record<string, string>;

  if (!redirect_uri || !code_challenge) {
    res.status(400).json({ error: "Missing redirect_uri or code_challenge" });
    return;
  }

  if (code_challenge_method && code_challenge_method !== "S256") {
    res
      .status(400)
      .json({ error: "Only S256 code_challenge_method is supported" });
    return;
  }

  const user = req.user as User;
  const code = crypto.randomBytes(32).toString("hex");

  authCodes.set(code, {
    userId: user.id,
    codeChallenge: code_challenge,
    redirectUri: redirect_uri,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);

  res.redirect(redirectUrl.toString());
});

// Token endpoint
oauthRouter.post("/token", async (req, res) => {
  const { grant_type, code, code_verifier, redirect_uri, refresh_token } =
    req.body as Record<string, string>;

  try {
    if (grant_type === "authorization_code") {
      if (!code || !code_verifier) {
        res.status(400).json({ error: "Missing code or code_verifier" });
        return;
      }

      const stored = authCodes.get(code);
      if (!stored) {
        res
          .status(400)
          .json({ error: "Invalid or expired authorization code" });
        return;
      }

      if (stored.expiresAt < new Date()) {
        authCodes.delete(code);
        res.status(400).json({ error: "Authorization code expired" });
        return;
      }

      if (redirect_uri && stored.redirectUri !== redirect_uri) {
        res.status(400).json({ error: "redirect_uri mismatch" });
        return;
      }

      if (!verifyPkce(code_verifier, stored.codeChallenge)) {
        res.status(400).json({ error: "Invalid code_verifier" });
        return;
      }

      authCodes.delete(code);

      const userRepo = pg.getRepository(User);
      const user = await userRepo.findOne({ where: { id: stored.userId } });
      if (!user) {
        res.status(400).json({ error: "User not found" });
        return;
      }

      const access = generateToken();
      const refresh = generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      const tokenRepo = pg.getRepository(OAuthToken);
      const token = tokenRepo.create({
        accessTokenHash: access.hash,
        refreshTokenHash: refresh.hash,
        expiresAt,
        user,
        userId: user.id,
      });
      await tokenRepo.save(token);

      res.json({
        access_token: access.raw,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: refresh.raw,
      });
      return;
    }

    if (grant_type === "refresh_token") {
      if (!refresh_token) {
        res.status(400).json({ error: "Missing refresh_token" });
        return;
      }

      const refreshHash = crypto
        .createHash("sha256")
        .update(refresh_token)
        .digest("hex");

      const tokenRepo = pg.getRepository(OAuthToken);
      const existing = await tokenRepo.findOne({
        where: { refreshTokenHash: refreshHash },
        relations: ["user"],
      });

      if (!existing) {
        res.status(400).json({ error: "Invalid refresh token" });
        return;
      }

      const access = generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      existing.accessTokenHash = access.hash;
      existing.expiresAt = expiresAt;
      await tokenRepo.save(existing);

      res.json({
        access_token: access.raw,
        token_type: "Bearer",
        expires_in: 3600,
      });
      return;
    }

    res.status(400).json({ error: "Unsupported grant_type" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default oauthRouter;
