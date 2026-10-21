import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import pg from "./db.config";
import bcrypt from "bcrypt";
import { User } from "./entities/User";
import _ from "lodash";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } =
  process.env;

export function isGoogleAuthEnabled() {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export default function initializePassport() {
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async function verify(email, password, cb) {
        // Validate user
        if (!email || !password) {
          cb(null, false, { message: "All fields are required" });
          return;
        }

        const userRepository = pg.getRepository(User);
        const existingUser = await userRepository.findOne({ where: { email } });
        if (!existingUser) {
          cb(null, false, { message: "User not found" });
          return;
        }

        const isPasswordValid = bcrypt.compareSync(
          password,
          existingUser.password,
        );

        if (!isPasswordValid) {
          cb(null, false, { message: "Invalid credentials" });
          return;
        }

        cb(null, existingUser);
      },
    ),
  );

  if (isGoogleAuthEnabled()) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID!,
          clientSecret: GOOGLE_CLIENT_SECRET!,
          callbackURL: GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
        },
        async (_, __, profile, done) => {
          try {
            const userRepository = pg.getRepository(User);
            let user = await userRepository.findOne({
              where: { googleId: profile.id },
            });

            if (!user) {
              user = await userRepository.findOne({
                where: { email: profile.emails?.[0]?.value },
              });

              if (user) {
                user.googleId = profile.id;
                await userRepository.save(user);
              } else {
                user = new User();
                user.googleId = profile.id;
                user.email = profile.emails?.[0]?.value || "";
                user.firstName = profile.name?.givenName || "";
                user.lastName = profile.name?.familyName || "";
                await userRepository.save(user);
              }
            }

            done(null, user);
          } catch (err) {
            done(err as Error, undefined);
          }
        },
      ),
    );
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await pg.getRepository(User).findOne({ where: { id } });
      if (!user) {
        return done(new Error("User not found"), false);
      }
      done(
        null,
        _.pick(user, [
          "id",
          "firstName",
          "lastName",
          "role",
          "profilePicture",
          "createdAt",
          "storageUsedBytes",
        ]) as User,
      );
    } catch (err) {
      done(err, false);
    }
  });
}
