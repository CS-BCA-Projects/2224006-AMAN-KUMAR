import express from "express";
import User from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

// ✅ Render Super Admin Dashboard
const superAdminDashboard = asyncHandler(async (req, res) => {
    res.render("superadmin-dashboard");
});

// ✅ Fetch all Admins (Now directly from User model)
const getAllAdmins = asyncHandler(async (req, res) => {
    const admins = await User.find({ role: "Admin" }, "name email phone state address pinCode");
    res.status(200).json(admins);
});
//fetch a single admin
const getAdmin = asyncHandler(async (req, res) => {
    try {
        const admin = await User.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        res.status(200).json(admin);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// ✅ Add a new Admin (State is assigned as a zone)
const addAdmin = asyncHandler(async (req, res) => {
    const { email, name, phone, address, pinCode, state } = req.body;

    // Check if Admin already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: "Admin with this email already exists" });
    }

    // Create a new Admin user
    const newAdmin = await User.create({
        email,
        name,
        phone,
        address,
        pinCode,
        state, // ✅ Assigned Zone is now stored as State
        role: "Admin",
        password: "gurudev123", // Default password
        isVerified: true
    });

    res.status(201).json({ message: "Admin added successfully", newAdmin });
});

// ✅ Update Admin details
const updateAdmin = asyncHandler(async (req, res) => {
    const { name, phone, address, pinCode, state } = req.body;

    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== "Admin") {
        return res.status(404).json({ message: "Admin not found" });
    }

    // Update Admin details
    admin.name = name;
    admin.phone = phone;
    admin.address = address;
    admin.pinCode = pinCode;
    admin.state = state; // ✅ Update assigned zone (state)
    await admin.save();

    res.status(200).json({ message: "Admin updated successfully" });
});

// ✅ Delete Admin
const deleteAdmin = asyncHandler(async (req, res) => {
    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== "Admin") {
        return res.status(404).json({ message: "Admin not found" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Admin deleted successfully" });
});

// ✅ Exporting Functions
export {
    superAdminDashboard,
    getAdmin,
    getAllAdmins,
    addAdmin,
    updateAdmin,
    deleteAdmin
};
