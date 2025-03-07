import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.models.js";
import EventRequest from '../models/eventRequest.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { findLanLon } from '../utils/extractLatLon.js';
import jwt from "jsonwebtoken";
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import { getNearestSPHead } from '../utils/findNearestSPHeaad.js';

const registerEvent = asyncHandler(async (req, res) => {
    const user = req.user; // ✅ Fix: Directly use req.user, no need for user._id

    if (!user) {
        throw new ApiError(401, "User not found");
    }

    const { eventType, requested_date, requested_time, description = "" } = req.body;
    console.log("Event:", eventType, "\nRequested Date:", requested_date, "\nRequested Time:", requested_time);
    console.log("User is:", user);


    // ✅ Fix: Use (!field) instead of trim() to avoid undefined error
    if (!eventType || !requested_date || !requested_time) {
        throw new ApiError(400, "Event type, date, and time are required");
    }

    // ✅ Store event request in DB
    const requestedEvent = await EventRequest.create({
        user_id: user._id,
        eventType,
        requested_date,
        requested_time,
        description
    });

    if (!requestedEvent) {
        throw new ApiError(500, "Event registration failed. Please retry.");
    }

    // ✅ Ensure user has valid location data before finding SPHead
    if (!user.lat || !user.lon || !user.state || !user.district) {
        return res.status(400).json(new ApiResponse(400, {}, "User location details are missing"));
    }

    const eventAssignedTo = await getNearestSPHead(user.lat, user.lon, user.state, user.district);

    if (!eventAssignedTo) {
        return res.status(200).json(new ApiResponse(200, {}, "Event request is not available at your place"));
    }

    console.log("Event assigned to:", eventAssignedTo);

    return res.status(200).json({
        success: true,
        message: "User registration completed, data saved successfully",
        redirectUrl: `/api/v1/user-dashboard`
    });
});

export { registerEvent };
