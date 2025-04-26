import express from "express";
import User from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

const superAdminDashboard = asyncHandler(async (req, res) => {
    res.render("superadmin-dashboard");
});

const getAllAdmins = asyncHandler(async (req, res) => {
    const admins = await User.find({ role: "Admin" }, "name email phone state address pinCode");
    res.status(200).json(admins);
});

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

const addAdmin = asyncHandler(async (req, res) => {
    const { email, name, phone, address, pinCode, state } = req.body;

    let existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: "Admin with this email already exists" });
    }

    const newAdmin = await User.create({
        email,
        name,
        phone,
        address,
        pinCode,
        state, 
        role: "Admin",
        password: "gurudev123", 
        isVerified: true
    });

    res.status(201).json({ message: "Admin added successfully", newAdmin });
});

const updateAdmin = asyncHandler(async (req, res) => {
    const { name, phone, address, pinCode, state } = req.body;

    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== "Admin") {
        return res.status(404).json({ message: "Admin not found" });
    }
    admin.name = name;
    admin.phone = phone;
    admin.address = address;
    admin.pinCode = pinCode;
    admin.state = state; 
    await admin.save();

    res.status(200).json({ message: "Admin updated successfully" });
});

const deleteAdmin = asyncHandler(async (req, res) => {
    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== "Admin") {
        return res.status(404).json({ message: "Admin not found" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Admin deleted successfully" });
});


export {
    superAdminDashboard,
    getAdmin,
    getAllAdmins,
    addAdmin,
    updateAdmin,
    deleteAdmin
};
