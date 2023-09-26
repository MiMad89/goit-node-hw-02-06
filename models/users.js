const User = require("../service/schema/users");
const passport = require("passport");
multer = require("multer");
const { nanoid } = require("nanoid");
const nodemailer = require("nodemailer");

require("dotenv").config();
const emailPassword = process.env.EMAIL_PASSWORD;

const auth = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (error, user) => {
    if (!user || error)
      return res.status(401).json({ message: "Not authorized" });
    req.user = user;
    next();
  })(req, res, next);
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/avatars");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname +
        "-" +
        uniqueSuffix +
        "." +
        file.originalname.split(".").pop()
    );
  },
});

const upload = multer({ storage: storage });

const allUsers = async () => {
  try {
    return await User.find();
  } catch (error) {
    console.log("Error getting User list: ", error);
    throw error;
  }
};

const getUserById = async (id) => {
  try {
    return await User.findById(id);
  } catch (error) {
    console.log(`Error getting User with id ${id}: `, error);
    throw error;
  }
};

const signup = async (body) => {
  const existingUser = await User.findOne(body);
  if (existingUser) {
    return 409;
  }
  try {
    return await User.create(body);
  } catch (error) {
    console.log("Error adding new user: ", error);
    throw error;
  }
};

const login = async (body) => {
  try {
    return await User.findOne(body);
  } catch (error) {
    console.log("Error logging in: ", error);
    throw error;
  }
};

const deleteUser = async (id) => {
  try {
    return await User.findByIdAndDelete(id);
  } catch (error) {
    console.log(`Error deleting User with id ${id}: `, error);
    throw error;
  }
};

const verificationEmail = async (verificationToken) => {
  const user = await User.findOne({ verificationToken });
  if (!user) {
    return { message: "404" };
  }
  user.verify = true;
  user.verificationToken = "null";
  await user.save();

  return user;
};

const sendVerificationemail = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.verify) {
    return res
      .status(400)
      .json({ message: "Verification has already been passed" });
  }

  const verificationToken = nanoid(16);

  user.verificationToken = verificationToken;
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
  return user;
};

module.exports = {
  auth,
  allUsers,
  deleteUser,
  getUserById,
  signup,
  login,
  upload,
  verificationEmail,
  sendVerificationemail,
};
