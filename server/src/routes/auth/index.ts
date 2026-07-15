import passport from "passport";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Router } from "express";
import { User } from "../../config/entities/User";
import pg from "../../config/db.config";
import resend from "../../config/resend.config";
import { isGoogleAuthEnabled } from "../../config/passport.config";

const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  // Validate user
  const { firstName, lastName, email, password } = req.body;
  if (!firstName || !lastName || !email || !password) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);

  const newUser = new User();

  newUser.firstName = firstName;
  newUser.lastName = lastName;
  newUser.email = email;
  newUser.password = hash;

  // Save user to the database
  const userRepository = pg.getRepository(User);
  const result = await userRepository.save(newUser);

  req.login(result, (err) => {
    if (err) {
      res.status(500).json({
        message: "Registration succeeded but login failed",
      });
      return;
    }
    res.status(201).json({
      message: "User registered successfully",
      user: result,
    });
  });
});

authRouter.post(
  "/login",
  (req, res, next) => {
    if (req.isAuthenticated()) {
      res.status(200).json({ message: "Already logged in", user: req.user });
      return;
    }
    next();
  },
  passport.authenticate("local"),
  (req, res) => {
    if (req.isAuthenticated()) {
      res.status(200).json({
        message: "Login successful",
        user: req.user,
      });
    } else {
      res.status(401).json({ message: "Login failed" });
    }
  },
);

authRouter.get("/check", (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({
      message: "User is authenticated",
      user: req.user,
    });
  } else {
    res.status(401).json({ message: "User is not authenticated" });
  }
});

authRouter.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ message: "Logout failed", error: err });
      return;
    }
    res.status(200).json({ message: "Logout successful" });
  });
});

authRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ message: "Email is required" });
    return;
  }

  const userRepository = pg.getRepository(User);
  const user = await userRepository.findOne({ where: { email } });

  if (!user) {
    res.status(200).json({ message: "Password reset email sent" });
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 3600000);

  user.resetToken = resetToken;
  user.resetTokenExpiry = resetTokenExpiry;
  await userRepository.save(user);

  const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
  const resetUrl = `${origin}/reset-password?token=${resetToken}`;

  if (resend) {
    await resend.emails.send({
      from: "do-not-reply@bloop-on.cloud",
      to: email,
      subject: "Réinitialisation de votre mot de passe",
      html: `
        <h2>Réinitialisation de mot de passe</h2>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
        <a href="${resetUrl}">Réinitialiser mon mot de passe</a>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      `,
    });
  }

  res.status(200).json({ message: "Password reset email sent" });
});

authRouter.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ message: "Token and password are required" });
    return;
  }

  const userRepository = pg.getRepository(User);
  const user = await userRepository.findOne({ where: { resetToken: token } });

  if (!user) {
    res.status(400).json({ message: "Invalid or expired token" });
    return;
  }

  if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    res.status(400).json({ message: "Token has expired" });
    return;
  }

  user.password = bcrypt.hashSync(password, 10);
  user.resetToken = null as any;
  user.resetTokenExpiry = null as any;
  await userRepository.save(user);

  res.status(200).json({ message: "Password updated successfully" });
});

authRouter.get("/config", (_, res) => {
  res.status(200).json({ googleAuthEnabled: isGoogleAuthEnabled() });
});

authRouter.get("/google", (req, res, next) => {
  const redirect = (req.query.redirect as string) || "/";
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: Buffer.from(redirect).toString("base64"),
  })(req, res, next);
});

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login?error=google_auth_failed",
  }),
  (req, res) => {
    const state = req.query.state as string;
    let redirectPath = "/";
    if (state) {
      try {
        const decoded = Buffer.from(state, "base64").toString("utf-8");
        if (decoded.startsWith("/") && !decoded.startsWith("//")) {
          redirectPath = decoded;
        }
      } catch {
        redirectPath = "/";
      }
    }
    res.redirect(redirectPath);
  },
);

export default authRouter;
