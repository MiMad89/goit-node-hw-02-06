const express = require("express");
const router = express.Router();
const users = require("../../models/users");
const jwt = require("jsonwebtoken");

require("dotenv").config();
const secret = process.env.SECRET;

router.get("/", async (req, res, next) => {
  try {
    const usersList = await users.allUsers();
    res.status(200).json({
      message: "success",
      data: { usersList },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "error",
      error: error.message,
    });
  }
});

router.post("/signup", async (req, res, next) => {
    const { email, password, subscription } = req.body;
  
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Error! Missing fields! Empty request is not allowed" });
    }
    try {
      const user = await users.signup(req.body);
      if (user === 409) {
        return res.status(409).json({ message: "Email in use" });
      }
      return res.status(201).json({
        status: "User added",
        code: 201,
        user: { email, subscription },
      });
    } catch (error) {
      res.status(500).json(`User could not be created: ${error}`);
    }
  });

  router.post("/login", async (req, res, next) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Error! Missing fields! Empty request is not allowed" });
    }
  
    try {
      const user = await users.login(req.body);
  
      if (!user) {
        return res
          .status(400)
          .json({ message: "Error! Email or password is wrong!" });
      }
      const { id, subscription } = user;
      const payload = {
        id,
        email,
        subscription,
      };
  
      const token = jwt.sign(payload, secret, { expiresIn: "1h" });
      user.token = token;
      await user.save();
  
      res.status(200).json({
        status: "success",
        code: 200,
        token: token,
        user: { email, subscription },
      });
    } catch (error) {
      res.status(500).json(`An error occurred while adding the user: ${error}`);
    }
  });

  router.get("/current", users.auth, async (req, res, next) => {
    try {
      const { id } = req.user;
      const user = await users.getUserById(id);
  
      if (!user) {
        return res.status(404).json({ message: "Error! User not found!" });
      }
      const { email, subscription } = user;
      return res.status(200).json({
        status: "success",
        code: 200,
        data: { email, subscription },
      });
    } catch (err) {
      res.status(500).json(`An error occurred while getting the contact: ${err}`);
    }
  });

  router.get("/logout", users.auth, async (req, res, next) => {
    try {
      const { id } = req.user;
      const user = await users.getUserById(id);
      if (!user) {
        return res.status(401).json({ message: "Not authorized" });
      }
      user.token = null;
      await user.save();
      res.status(204).send();
    } catch (error) {
      res.status(500).json(`An error occurred while logging out: ${error}`);
    }
  });

  router.delete("/:userId", users.auth, async (req, res, next) => {
    try {
      const { userId } = req.params;

      const user = await users.deleteUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Error! User not found!" });
      }
      return res.status(200).json({
        status: "success",
        code: 200,
        message: "Contact deleted",
        data: { user },
      });
    } catch (error) {
      res.status(500).json(`An error occurred while deleting the contact: ${error}`);
    }
  });

    module.exports = router;