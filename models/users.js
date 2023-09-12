const User = require("../service/schema/users");
const jwt = require("jsonwebtoken");
const passport = require("passport");

const auth = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (error, user) => {
    if (!user || error)
      return res.status(401).json({ message: "Not authorized" });
    req.user = user;
    next();
  })(req, res, next);
};

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

  module.exports = {
    auth,
    allUsers,
    deleteUser,
    getUserById,
    signup,
    login,
    };
    