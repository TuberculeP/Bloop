import { Router } from "express";
import pg from "../../config/db.config";
import { User } from "../../config/entities/User";

const userRouter = Router();

userRouter.patch("/", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        status: 401,
        message: "User not logged in",
      });
      return;
    }

    const userRepository = pg.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.user.id },
    });

    if (user) {
      const { firstName, lastName, email, profilePicture } = req.body;

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (email) user.email = email;
      if (profilePicture) user.profilePicture = profilePicture;

      await userRepository.save(user);

      res.status(200).json({
        status: 200,
        message: "User successfully updated",
        user,
      });
      return;
    }

    res.status(404).json({
      status: 404,
      message: "User not found",
    });
  } catch (err) {
    res.json(err);
    res.status(500).json({
      status: 500,
      message: "Error updating user",
    });
  }
});

export default userRouter;
