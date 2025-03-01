import mongoose from "mongoose";
import User from "./models/user.models.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import connectDB from "./db/index.js";


dotenv.config({
    path: "./.env"
})

const createSuperAdmin = async () => {
    try {
        await connectDB()

        const existingSuperAdmin = await User.findOne({ role: "SuperAdmin" });

        if (!existingSuperAdmin) {
            const hashedPassword = await bcrypt.hash(process.env.SUPERADMIN_PASSWORD, 10);

            await User.create({
                email: process.env.SUPERADMIN_EMAIL,
                password: hashedPassword,
                role: "SuperAdmin",
                isVerified: true
            });

            console.log("✅ SuperAdmin created successfully!");
        } else {
            console.log("✅ SuperAdmin already exists.");
        }
        
        mongoose.connection.close();
    } catch (error) {
        console.error("❌ Error creating SuperAdmin:", error);
        mongoose.connection.close();
    }
};

// Run the function
createSuperAdmin();
