const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserRepository = require("../repositories/user.repository");

class AuthService {
    constructor() {
        this.userRepo = UserRepository;
    }

    async registerUser({ username, email, password }) {
        try {
            const existingUser = await this.userRepo.findByEmail(email);
            if (existingUser) {
                return { 
                    Code: -1, 
                    Message: "Email already exists", 
                    Data: null 
                };
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await this.userRepo.createUser({ username, email, password: hashedPassword });

            if (!newUser) {
                return { 
                    Code: -1, 
                    Message: "Failed to register user", 
                    Data: null 
                };
            }

            return { 
                Code: 1, 
                Message: "User registered successfully", 
                Data: newUser 
            };
        } catch (error) {
            console.error("Error in registerUser:", error);
            return { 
                Code: -1, 
                Message: "Internal Server Error", 
                Data: null 
            };
        }
    }

    async loginUser({ email, password }) {
        try {
            const user = await this.userRepo.findByEmail(email);
            if (!user) {
                return { 
                    Code: -1, 
                    Message: "Invalid email or password", 
                    Data: null 
                };
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return { 
                    Code: -1, 
                    Message: "Invalid email or password", 
                    Data: null 
                };
            }

            const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

            return { 
                Code: 1, 
                Message: "Login successful", 
                Data: { token, user } 
            };
        } catch (error) {
            console.error("Error in loginUser:", error);
            return { 
                Code: -1, 
                Message: "Internal Server Error", 
                Data: null 
            };
        }
    }

    async getUserById(id) {
        try {
            const user = await this.userRepo.findById(id);
            if (!user) {
                return { 
                    Code: -1, 
                    Message: "User not found", 
                    Data: null 
                };
            }
            return { 
                Code: 1, 
                Message: "User found", 
                Data: user 
            };
        } catch (error) {
            console.error("Error in getUserById:", error);
            return { 
                Code: -1,
                Message: "Internal Server Error", 
                Data: null 
            };
        }
    }
}

module.exports = AuthService;
