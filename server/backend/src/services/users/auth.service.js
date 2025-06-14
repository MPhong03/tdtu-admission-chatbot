const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserRepository = require("../../repositories/user.repository");
const HttpResponse = require("../../data/responses/http.response");
const BaseRepository = require("../../repositories/common/base.repository");

const Chat = require("../../models/users/chat.model");
const Folder = require("../../models/users/folder.model");
const History = require("../../models/users/history.model");

const ChatRepo = new BaseRepository(Chat);
const FolderRepo = new BaseRepository(Folder);
const HistoryRepo = new BaseRepository(History);

class AuthService {
    constructor() {
        this.userRepo = UserRepository;
    }

    async registerUser({ username, email, password, visitorId }) {
        try {
            const existingUser = await this.userRepo.findByEmail(email);
            if (existingUser) {
                return HttpResponse.error("Email already exists");
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await this.userRepo.createUser({ username, email, password: hashedPassword });

            if (!newUser) {
                return HttpResponse.error("Failed to register user");
            }

            if (visitorId) {
                await this.mapVisitorDataToUser(visitorId, newUser._id);
            }

            return HttpResponse.success("User registered successfully", newUser);
        } catch (error) {
            console.error("Error in registerUser:", error);
            return HttpResponse.error("Internal Server Error");
        }
    }

    async loginUser({ email, password, visitorId }) {
        try {
            const user = await this.userRepo.findByEmail(email);
            if (!user) {
                return HttpResponse.error("Invalid email or password");
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return HttpResponse.error("Invalid email or password");
            }

            if (visitorId) {
                await this.mapVisitorDataToUser(visitorId, user._id);
            }

            const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" });

            const { password: _, ...userWithoutPassword } = user.toObject();

            return HttpResponse.success("Login successful", { token, user: userWithoutPassword });
        } catch (error) {
            console.error("Error in loginUser:", error);
            return HttpResponse.error("Internal Server Error");
        }
    }

    async getUserById(id) {
        try {
            const user = await this.userRepo.findById(id);
            if (!user) {
                return HttpResponse.error("User not found");
            }
            return HttpResponse.success("User found", user);
        } catch (error) {
            console.error("Error in getUserById:", error);
            return HttpResponse.error("Internal Server Error");
        }
    }

    async changePassword({ userId, oldPassword, newPassword }) {
        try {
            const user = await this.userRepo.findById(userId);
            if (!user) {
                return HttpResponse.error("User not found");
            }

            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return HttpResponse.error("Old password is incorrect");
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const updatedUser = await this.userRepo.updatePasswordById(userId, hashedPassword);

            if (!updatedUser) {
                return HttpResponse.error("Failed to change password");
            }

            return HttpResponse.success("Password changed successfully");
        } catch (error) {
            console.error("Error in changePassword:", error);
            return HttpResponse.error("Internal Server Error");
        }
    }

    async mapVisitorDataToUser(visitorId, userId) {
        try {
            const updateCondition = { visitorId };
            const updatePayload = { $set: { userId }, $unset: { visitorId: "" } };

            const [chatResult, folderResult, historyResult] = await Promise.all([
                ChatRepo.updateRange(updateCondition, updatePayload),
                FolderRepo.updateRange(updateCondition, updatePayload),
                HistoryRepo.updateRange(updateCondition, updatePayload)
            ]);

            console.log("Mapped visitor data to userId:", { chatResult, folderResult, historyResult });
        } catch (err) {
            console.error("Error mapping visitor data to user:", err);
        }
    }
}

module.exports = AuthService;
