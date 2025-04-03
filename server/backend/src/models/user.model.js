const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
}, {
    timestamps: true
});

UserSchema.statics.createDefaultAdmin = async function () {
    try {
        // Kiểm tra xem đã tồn tại admin nào chưa
        const adminExists = await this.findOne({ role: "admin" });
        if (!adminExists) {
            const adminEmail = "admin@tdtu.vn";
            const adminPassword = "admin";
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            const adminUser = new this({
                username: "admin",
                email: adminEmail,
                password: hashedPassword,
                role: "admin",
            });
            await adminUser.save();
            console.log(`Default admin created: ${adminEmail}`);
        } else {
            console.log("Admin already exists");
        }
    } catch (error) {
        console.error("Error creating default admin:", error);
    }
};

module.exports = mongoose.model("User", UserSchema);
