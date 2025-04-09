import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.models.js"
import { ApiResponse } from '../utils/ApiResponse.js';
import { findLanLon } from '../utils/extractLatLon.js';
import jwt from "jsonwebtoken"
import mongoose from 'mongoose';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import receiveEmail from '../utils/receiveEmail.js';
import EventRequest from '../models/eventRequest.models.js';
import { getMatchingSPHeads } from '../utils/getMatchingSPHeads.js';
import { haversineDistance } from '../utils/haversineDistance.js';
import { sendNotification } from '../utils/sendNotification.js';
import { updateExpiredEvents } from '../utils/updateExpiredEvents.js';


// Temporary storage for unverified users
const unverifiedUsers = new Map(); // Can replace with Redis for better persistence
let passwordReset;

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

const login = asyncHandler(async (req, res) => {
    res.render('login');
});

const signUp = asyncHandler(async (req, res) => {
    res.render('signup')
});

const registerUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if ([email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All Fields are required")
    }

    const existedUser = await User.findOne({ email });

    if (existedUser) {
        throw new ApiError(409, "User already exists")
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiry

    // Store user data temporarily (NOT in MongoDB yet)
    unverifiedUsers.set(verificationToken, {
        email,
        password, // In real-world use, hash the password before storing
        verificationTokenExpires
    });

    // Send verification email
    const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    console.log(verificationLink)
    const emailSent = await sendEmail(
        email,
        "Verify Your Email",
        `<p>Click the link below to verify your email:</p>
        <a href="${verificationLink}">Verify Email</a>`
    );

    if (!emailSent) {
        unverifiedUsers.delete(verificationToken);
        throw new ApiError(500, "Error sending verification email");
    }

    // ✅ Redirect to verifyEmailForSignup page
    res.status(200).json({
        success: true,
        message: "Verification email sent!",
        redirectUrl: `/api/v1/verifyEmailForSignup?email=${email}`
    })
});

const verifyEmailPage = asyncHandler((req, res) => {
    const email = req.query.email; // Get email from query parameter
    res.render("verifyEmailForSignup", { email }); // Pass email to EJS
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
        throw new ApiError(400, "Invalid or missing token");
    }

    const storedUser = unverifiedUsers.get(token);

    // Check if the token is expired
    if (!storedUser || storedUser.verificationTokenExpires < Date.now()) {
        unverifiedUsers.delete(token); //Remove expired token
        throw new ApiError(400, "Invalid or expired token");
    }

    try {
        // Save the user in MongoDB after verification
        const user = await User.create({
            email: storedUser.email,
            password: storedUser.password, // Already hashed
            isVerified: true,
        });

        // Ensure user is defined
        if (!user) {
            throw new ApiError(500, "User creation failed, please try again.");
        }

        // Remove from temporary storage after successful creation
        unverifiedUsers.delete(token);

        // Secure cookie options
        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "None", 
        };

        // Fetch newly created user
        const createdUser = await User.findById(user._id).select("-password");
        if (!createdUser) {
            throw new ApiError(500, "Error retrieving saved user.");
        }

        // Generate access & refresh tokens
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(createdUser._id);
        if (!accessToken || !refreshToken) {
            throw new ApiError(500, "Failed to generate authentication tokens.");
        }

        res.cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)

            .redirect(`/api/v1/contact-details`);

    } catch (error) {
        console.error("Error in email verification:", error);
        throw new ApiError(500, "Internal Server Error");
    }
});

// Serve Contact Details Page
const contactDetails = asyncHandler(async (req, res) => {
    res.render("contactDetails"); // Pass it to the template
});

const resetPasswordPage = asyncHandler(async (req, res) => {
    res.render('resetPassword')
})

const feedContact = asyncHandler(async (req, res) => {
    // Get user details from frontend
    const user_id = req.user._id;
    const { name, address, state, district, pinCode, phone } = req.body;

    const user = await User.findById(user_id);

    // Validate fields
    if ([name, address, state, district, pinCode, phone].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All Fields are required");
    }
    
    try {
        // Await the function call to get latitude & longitude
        const location = await findLanLon(pinCode);

        // Check if location is null or missing lat/lon
        if (!location || !location.lat || !location.lon) {
            return res.status(400).json({ error: "Invalid pinCode. Unable to fetch latitude and longitude." });
        }
        // Extract latitude and longitude
        const lat = location.lat;
        const lon = location.lon;

        try {
            user.name = name;
            user.address = address;
            user.state = state;
            user.district = district;
            user.pinCode = pinCode;
            user.phone = phone;
            user.lat = lat;
            user.lon = lon;
            await user.save({ validateBeforeSave: false });
        } catch (error) {
            console.error("Error in saving contact details:", error);
            throw new ApiError(500, "Contact details could not be saved in MongoDB");
        }

        return res.status(201).json({
            success: true,
            message: "User Registration completed, Data saved Succesfully",
            redirectUrl: `/api/v1/login`
        })

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        throw new ApiError(400, "All feilds are required")
    }
    const user = await User.findOne({ email })

    if (!user) {
        throw new ApiError(404, "User Does Not Exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Password Incorrect");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: false,
        sameSite: "Lax", 
    }

    //Set up session (implementation not shown)
    switch (user.role) {
        case 'User':
            res.status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", refreshToken, options)
                .json({ success: true, redirectUrl: "/api/v1/user-dashboard" });
            break;
        case 'SPHead':
            res.status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", refreshToken, options)
                .json({ success: true, redirectUrl: "/api/v1/spHead-dashboard" });
            break;
        case 'Admin':
            res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({ success: true, redirectUrl: "/api/v1/admin/dashboard" });
            break;
        case 'SuperAdmin':
            res.status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", refreshToken, options)
                .json({ success: true, redirectUrl: "/api/v1/superadmin/dashboard" });
            break;
        default:
            res.status(403).json({ success: false, message: "Unauthorized access" });
    }
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        sameSite: "None", 
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User Logged Out")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorised Access");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh access token is expired or used")
        }

        const options = {
            httpOnly: true,
            sameSite: "None", 
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})
const changePasswordPage = asyncHandler(async (req, res) => {
    res.render('changeCurrentPassword')
})
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(404, "Password Incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password has been changed")
        )
});

const forgotPassword = asyncHandler(async (req, res) => {
    //get url to forgot password
    //get email newpass and cnfPass
    //local storage for newPAss
    //send an email to verify and edit it 
    const { email, newPassword, cnfPassword } = req.body;

    const existedUser = await User.findOne({ email });

    if (!existedUser) {
        throw new ApiError(400, "User not found")
    }

    if (newPassword !== cnfPassword) {
        throw new ApiError(400, "Password does not match")
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours expiry

    // Store user data temporarily (NOT in MongoDB yet)
    unverifiedUsers.set(verificationToken, {
        email,
        newPassword, // In real-world use, hash the password before storing
        verificationTokenExpires
    });

    // Send verification email
    const verificationLink = `${process.env.CLIENT_URL_RESET_PASSWORD}/reset-password?token=${verificationToken}`;
    const emailSent = await sendEmail(
        email,
        "[AWGP Seva Portal] Please reset you password",
        `<p>Reset your AWGP SEVA PORTAl password:</p>
        <a href="${verificationLink}">Verify Email</a>`
    );



    if (!emailSent) {
        unverifiedUsers.delete(verificationToken);
        throw new ApiError(500, "Error sending verification email");
    }

    return res.status(200)
        .json(new ApiResponse(200, {}, "Reset password link has been sent to your registered email Id"))

})

const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
        throw new ApiError(400, "Invalid or missing token");
    }

    const storedUser = unverifiedUsers.get(token);

    // Check if the token is expired
    if (!storedUser || storedUser.verificationTokenExpires < Date.now()) {
        unverifiedUsers.delete(token); // ✅ Remove expired token
        throw new ApiError(400, "Invalid or expired token");
    }

    // Save the user in MongoDB **AFTER** email verification

    const { email, newPassword } = storedUser;

    const user = await User.findOne({ email });
    try {
        user.password = newPassword;
        await user.save({ validateBeforeSave: false });
    } catch (error) {
        console.error("Error in reseting the password:", error);
        throw new ApiError(500, "User password could not be reseet in MongoDB");
    }

    // Ensure user is defined before proceeding
    if (!user) {
        throw new ApiError(500, "Paaword reset failed, please try again.");
    }

    // Remove from temporary storage
    unverifiedUsers.delete(token);

    // Fetch the newly created user
    const createdUser = await User.findById(user._id).select("-password");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while retrieving the saved user.");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "Email verified successfully. User password reset successfull.")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200)
        .json(new ApiResponse(200,
            req.user,
            "Current user fetched successsfully")
        )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        { new: true }

    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const getLoggedInUserDetails = asyncHandler(async (req, res) => {
    const user = req.user;
    const userId = user._id.toString();

    try {
        const userDetails = await User.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(userId) }
            },
            {
                $lookup: {
                    from: "eventrequests",
                    localField: "_id",
                    foreignField: "requestedBy",
                    as: "allEvents"
                }
            },
            {
                $addFields: {
                    recentEventRequest: {
                        $filter: {
                            input: "$allEvents",
                            as: "event",
                            cond: { $eq: ["$$event.status", "Pending"] }
                        }
                    },
                    completedEventRequest: {
                        $filter: {
                            input: "$allEvents",
                            as: "event",
                            cond: { $eq: ["$$event.status", "Completed"] }
                        }
                    },
                    rejectedEventRequest: {
                        $filter: {
                            input: "$allEvents",
                            as: "event",
                            cond: { $eq: ["$$event.status", "Rejected"] }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    phone: 1,
                    state: 1,
                    district: 1,
                    address: 1,
                    pinCode: 1,
                    recentEventRequest: 1,
                    completedEventRequest: 1,
                    rejectedEventRequest: 1
                }
            }
        ]);

        return userDetails[0] || null; // Return the first result or null if not found
    } catch (error) {
        console.error("Error fetching user details:", error);
        throw new Error("Failed to fetch user details.");
    }
});

const userDashboard = asyncHandler(async (req, res) => {
    const user = req.user;
    const userId = user._id.toString(); // ✅ Convert ObjectId to String

    await updateExpiredEvents(userId); // Check & reject expired events
    try {
        const userDetails = await User.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(userId) } // Ensure user exists
            },
            {
                $lookup: {
                    from: "eventrequests",
                    let: { userIdStr: { $toString: "$_id" } }, // Convert ObjectId to string
                    pipeline: [
                        { $match: { $expr: { $eq: ["$requestedBy", "$$userIdStr"] } } }
                    ],
                    as: "allEvents"
                }
            },
            {
                $addFields: {
                    recentEventRequest: {
                        $filter: {
                            input: "$allEvents",
                            as: "event",
                            cond: { $in: ["$$event.status", ["Pending", "Assigned","Approved"]] }
                        }
                    },
                    completedEventRequest: {
                        $filter: {
                            input: "$allEvents",
                            as: "event",
                            cond: { $eq: ["$$event.status", "Completed"] }
                        }
                    },
                    rejectedEventRequest: {
                        $filter: {
                            input: "$allEvents",
                            as: "event",
                            cond: { $eq: ["$$event.status", "Rejected"] }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    phone: 1,
                    state: 1,
                    district: 1,
                    address: 1,
                    pinCode: 1,
                    lat: 1,
                    lon: 1,
                    role: 1,
                    status: 1,
                    recentEventRequest: 1,
                    completedEventRequest: 1,
                    rejectedEventRequest: 1
                }
            }
        ]);

        res.render("userDashboard", {
            user: userDetails[0] || {},
            recentEvents: userDetails[0]?.recentEventRequest || [],
            completedEvents: userDetails[0]?.completedEventRequest || [],
            rejectedEvents: userDetails[0]?.rejectedEventRequest || []
        });
    } catch (error) {
        console.error("Error fetching user details:", error);
        res.status(500).json({ error: "Failed to fetch user details." });
    }
});

const addEvent = asyncHandler(async (req, res) => {
    res.render('addEvent');
});

const registerEvent = asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new ApiError(401, "User not found");
    }

    const { eventType, requested_date, requested_time, description = "" } = req.body;

    if (!eventType || !requested_date || !requested_time) {
        throw new ApiError(400, "Event type, date, and time are required");
    }


    if (!user.lat || !user.lon || !user.state || !user.district) {
        return res.status(400).json(new ApiResponse(400, {}, "User location details are missing"));
    }

    const { lat, lon, state, district } = req.user;

    let nearestSPHead = null;
    let minDistance = Infinity;

    try {
        const spHeads = await getMatchingSPHeads(state, district);

        if (!spHeads || spHeads.length === 0) {
            return null;
        }

        for (const spHead of spHeads) {
            const distance = haversineDistance(lat, lon, spHead.lat, spHead.lon);
            if (distance === 0) nearestSPHead = spHead;

            if (distance <= 15 && distance < minDistance) {
                minDistance = distance;
                nearestSPHead = spHead;
            }
        }

        if (!nearestSPHead) {
            throw new ApiError(400,"No SPHead found within 15 km range.");
        } 
    } catch (error) {
        console.error("Error in getNearestSPHead:", error);
        throw new ApiError(500, "Something went wrong, please retry");
    }

    const eventAssignedTo = nearestSPHead;

    if (!eventAssignedTo) {
        return res.status(200).json(new ApiResponse(200, {}, "Event request is not available at your place"));
    }

    const requestedEvent = await EventRequest.create({
        requestedBy: user._id,
        eventType,
        requested_date,
        requested_time,
        description,
        assignedTo: eventAssignedTo._id,
        status: "Assigned"
    });

    if (!requestedEvent) {
        throw new ApiError(500, "Event registration failed. Please retry.");
    }

    await sendNotification(user._id, `Event is successfully registered and has been assigned to ${eventAssignedTo.name}`);
    await sendNotification(eventAssignedTo._id, `A new event has been requested for ${eventType} for Date : ${requested_date}`)
    return res.status(200).json({
        success: true,
        message: `Event registration completed, Event is assigned to : ${eventAssignedTo.name}  `,
        redirectUrl: `/api/v1/user-dashboard`
    });
});

const renderUpdatePage = async (req, res) => {
    try {
        const { eventId } = req.params;

        const event = await EventRequest.findById(eventId);

        if (!event) {
            return res.status(404).send("Event not found");
        }

        res.render("updateEvent", { event }); // Pass event data to EJS
    } catch (error) {
        res.status(500).send("Internal Server Error");
    }
};

const updateEventDetails = asyncHandler(async (req, res) => {
    try {
        const { eventId } = req.params;
        const { eventType, requested_date, requested_time, description = "" } = req.body;

        const updatedEvent = await EventRequest.findByIdAndUpdate(
            eventId,
            { eventType, requested_date, requested_time, description },
            { new: true } // Return updated document
        );

        if (!updatedEvent) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }
        await sendNotification(updatedEvent.requestedBy, `Event is successfully updated`);
        await sendNotification(updatedEvent.assignedTo, `A event has been updated for ${updatedEvent.eventType} for Date : ${updatedEvent.requested_date}`)
        res.status(200).json({ success: true, message: "Event updated successfully", updatedEvent });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

const cancelEventRequest = asyncHandler(async (req, res) => {
    try {
        const { eventId } = req.params;

        const deletedEvent = await EventRequest.findByIdAndDelete(eventId);

        if (!deletedEvent) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }
        await sendNotification(deletedEvent.requestedBy, `Event is successfully cancelled`);
        await sendNotification(deletedEvent.assignedTo, `An event has been cancelled for ${deletedEvent.eventType} for Date : ${deletedEvent.requested_date}`)
        res.status(200).json({ success: true, message: "Event canceled successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
})

const about = asyncHandler(async (req, res) => {
    let homeUrl = '';
    switch (req.user.role) {
        case 'User':
            homeUrl = '/api/v1/user-dashboard'
            break;
        case 'SPHead':
            homeUrl = "/api/v1/spHead-dashboard";
            break;
        default :
        return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
    res.render('aboutPage',{homeUrl})
});

const contactPage = asyncHandler(async (req, res) => {
    let homeUrl = '';
    switch (req.user.role) {
        case 'User':
            homeUrl = '/api/v1/user-dashboard'
            break;
        case 'SPHead':
            homeUrl = "/api/v1/spHead-dashboard";
            break;
        default :
        return res.status(403).json({ success: false, message: "Unauthorized access" });
    }
    res.render('contactPage',{homeUrl})
});

const sendMessage = asyncHandler(async(req,res) => {
    const {name , email, subject, message } = req.body;

    if(!name ||  !email || !subject, !message ){
        throw new ApiError(400, "All fields are required");
    }

    const emailSent = await receiveEmail(
        email,
        subject,
        `<p>Hello,</p>
        <p>You have received a new message from <bold> ${name} </bold> to your website contact form.</p>
        <p>${message}</p>
           <p>🔗 Please respond as soon as possible.</p>
           
        <div class="text-center mt-4">
            <p class="text-muted">Thank you! <br> <strong>Your Website Team</strong></p>
        </div>`
    );

    if(!emailSent){
        throw new ApiError(500, "Unable to send the email")
    }

    return res.status(200).json(new ApiResponse(200,{},"Response send to the team members")) 
})
const spHeadDashboard = asyncHandler(async (req, res) => {
    const spHeadId = req.user._id.toString(); // Convert to String to match assignedTo

    await updateExpiredEvents(spHeadId);
    try {
        // **Step 1: Fetch SPHead details**
        const spHead = await User.findById(spHeadId).lean();
        if (!spHead) {
            return res.status(404).json({ error: "SPHead not found" });
        }

        // **Step 2: Fetch assigned events along with requester details**
        const assignedEvents = await EventRequest.aggregate([
            {
                $match: { assignedTo: spHeadId } // Match assignedTo as a String
            },
            {
                $addFields: {
                    requestedBy: { $toObjectId: "$requestedBy" } // Convert requestedBy to ObjectId
                }
            },
            {
                $lookup: {
                    from: "users", // Join with User collection
                    localField: "requestedBy",
                    foreignField: "_id",
                    as: "requesterDetails"
                }
            },
            {
                $unwind: {
                    path: "$requesterDetails",
                    preserveNullAndEmptyArrays: true
                } // Convert array to object, but keep events without user data
            },
            {
                $addFields: {
                    "allEvents": {
                        eventId: "$_id",
                        eventType: "$eventType",
                        requested_date: "$requested_date",
                        requested_time: "$requested_time",
                        status: "$status",
                        description: "$description",
                        requester: {
                            _id: "$requesterDetails._id",
                            name: "$requesterDetails.name",
                            email: "$requesterDetails.email",
                            phone: "$requesterDetails.phone",
                            state: "$requesterDetails.state",
                            district: "$requesterDetails.district",
                            address: "$requesterDetails.address",
                            pinCode: "$requesterDetails.pinCode"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: spHeadId,
                    allEvents: { $push: "$allEvents" }, // Store all event details in an array
                    recentEventRequests: {
                        $push: {
                            $cond: {
                                if: { $in: ["$status", ["Pending", "Assigned","Approved"]] },
                                then: "$allEvents",
                                else: "$$REMOVE"
                            }
                        }
                    },
                    completedEventRequests: {
                        $push: {
                            $cond: {
                                if: { $eq: ["$status", "Completed"] },
                                then: "$allEvents",
                                else: "$$REMOVE"
                            }
                        }
                    },
                    rejectedEventRequests: {
                        $push: {
                            $cond: {
                                if: { $eq: ["$status", "Rejected"] },
                                then: "$allEvents",
                                else: "$$REMOVE"
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    allEvents: 1,
                    recentEventRequests: { $filter: { input: "$recentEventRequests", as: "event", cond: { $ne: ["$$event", {}] } } },
                    completedEventRequests: { $filter: { input: "$completedEventRequests", as: "event", cond: { $ne: ["$$event", {}] } } },
                    rejectedEventRequests: { $filter: { input: "$rejectedEventRequests", as: "event", cond: { $ne: ["$$event", {}] } } }
                }
            }
        ]);

        const result = assignedEvents[0] || {
            allEvents: [],
            recentEventRequests: [],
            completedEventRequests: [],
            rejectedEventRequests: []
        };

        res.render("spHeadDashboard", {
            spHead, // SPHead details
            allEvents: result.allEvents,
            recentEventRequests: result.recentEventRequests,
            completedEventRequests: result.completedEventRequests,
            rejectedEventRequests: result.rejectedEventRequests
        });

    } catch (error) {
        console.error("Error fetching SPHead dashboard details:", error);
        res.status(500).json({ error: "Failed to fetch SPHead dashboard details." });
    }
});

const updateEventStatus = asyncHandler(async (req, res) => {
    try {
        const { eventId } = req.params;
        const { status } = req.body; // "Approved" or "Rejected"

        // Validate status
        if (!["Approved", "Rejected", "Completed"].includes(status)) {
            return res.status(400).json({ error: "Invalid status value" });
        }

        // Find event and update status
        const updatedEvent = await EventRequest.findByIdAndUpdate(
            eventId,
            { status },
            { new: true }
        );

        if (!updatedEvent) {
            return res.status(404).json({ error: "Event not found" });
        }

        await sendNotification(updatedEvent.requestedBy, `Event is  ${status} by the assigned spHead`);
        await sendNotification(updatedEvent.assignedTo, `Event is  ${status} by you for the requested ${updatedEvent.eventType} event.`)
        return res.json({ message: `Event status updated to ${status}`, updatedEvent });
    } catch (error) {
        console.error("Error updating event status:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

const helpSection = asyncHandler(async (req, res) => {
    res.render('help')
});



export {
    login,
    signUp,
    about,
    contactPage,
    contactDetails,
    verifyEmailPage,
    resetPasswordPage,
    userDashboard,
    spHeadDashboard,
    addEvent,
    registerUser,
    feedContact,
    verifyEmail,
    loginUser,
    logoutUser,
    refreshAccessToken,
    forgotPassword,
    resetPassword,
    getCurrentUser,
    updateAccountDetails,
    changeCurrentPassword,
    getLoggedInUserDetails,
    registerEvent,
    renderUpdatePage,
    updateEventDetails,
    cancelEventRequest,
    updateEventStatus,
    helpSection,
    changePasswordPage,
    sendMessage
};