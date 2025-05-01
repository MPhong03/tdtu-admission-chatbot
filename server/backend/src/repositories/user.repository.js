const User = require("../models/users/user.model");

class UserRepository {
    async findByEmail(email) {
        try {
            return await User.findOne({ email });
        } catch (error) {
            console.error("Error finding user by email:", error);
            return null;
        }
    }

    async findById(id) {
        try {
            return await User.findById(id);
        } catch (error) {
            console.error("Error finding user by ID:", error);
            return null;
        }
    }

    async createUser(userData) {
        try {
            const user = new User(userData);
            return await user.save();
        } catch (error) {
            console.error("Error creating user:", error);
            return null;
        }
    }
}

module.exports = new UserRepository();
