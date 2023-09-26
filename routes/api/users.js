const express = require("express");
const router = express.Router();
const users = require("../../models/users");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const Jimp = require("jimp");
const nodemailer = require("nodemailer");
const { nanoid } = require("nanoid");
const emailValidator = require("email-validator");

require("dotenv").config();
const secret = process.env.SECRET;
const emailPassword = process.env.EMAIL_PASSWORD;

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

  if (!emailValidator.validate(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    const verificationToken = nanoid(16);

    const user = await users.signup({
      email,
      password,
      subscription,
      verificationToken,
    });

    const avatarURL = gravatar.url(email, { s: "250", d: "identicon" });

    user.avatarURL = avatarURL;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "kowaltest89@gmail.com",
        pass: emailPassword,
      },
    });

    const verificationLink = `http://localhost:3000/api/users/verify/${verificationToken}`;

    const mailOptions = {
      from: "kowaltest89@gmail.com",
      to: email,
      subject: "Email Verification",
      text: `Click the following link to verify your email: ${verificationLink}`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(201).json({
      status: "User added",
      code: 201,
      message: "Verification email sent",
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

    if (!user.verify) {
      return res
        .status(400)
        .json({ message: "Error! Email is not verified yet!" });
    }

    const { id, subscription, avatarURL, verify } = user;
    const payload = {
      id,
      email,
      subscription,
      avatarURL,
      verify,
    };

    const token = jwt.sign(payload, secret, { expiresIn: "1h" });
    user.token = token;
    await user.save();

    res.status(200).json({
      status: "success",
      code: 200,
      token: token,
      user: { email, subscription, avatarURL, verify },
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
    res
      .status(500)
      .json(`An error occurred while deleting the contact: ${error}`);
  }
});

router.patch(
  "/avatars",
  users.auth,
  users.upload.single("avatar"),
  async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: "Not authorized" });
      }

      const image = await Jimp.read(req.file.path);
      image.resize(250, 250);

      user.avatarURL = `/avatars/${req.file.filename}`;
      await user.save();

      return res.status(200).json({
        avatarURL: user.avatarURL,
      });
    } catch (error) {
      res
        .status(500)
        .json(`An error occurred while updating the avatar: ${error}`);
    }
  }
);

router.get("/verify/:verificationToken", async (req, res, next) => {
  try {
    const { verificationToken } = req.params;
    const veryfiUser = await users.verificationEmail(verificationToken);
    if (veryfiUser.message === "404") {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ message: "Verification successful" });
  } catch (error) {
    res.status(500).json(`Error verifying email: ${error}`);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Missing required field: email" });
    }

    const user = await users.sendVerificationemail(email);

    if (user.message === "404") {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.message === "400") {
      return res
        .status(400)
        .json({ message: "Verification has already been passed" });
    }

    return res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    res.status(500).json(`Error verifying email: ${error}`);
  }
});

module.exports = router;
