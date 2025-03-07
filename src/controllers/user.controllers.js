import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.models.js"
import { ApiResponse } from '../utils/ApiResponse.js';
import { findLanLon } from '../utils/extractLatLon.js';
import jwt from "jsonwebtoken"

import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import EventRequest from '../models/eventRequest.models.js';
import { getNearestSPHead } from '../utils/findNearestSPHeaad.js';


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

const dashboard = asyncHandler(async (req, res) => {
    res.render("dashboard")
})

const login = asyncHandler(async (req, res) => {
    res.render('login');
});

const signUp = asyncHandler(async (req, res) => {
    res.render('signup')
});

const registerUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    console.log("Email : ", email + "Password : ", password);

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

          .redirect(`http://localhost:4001/api/v1/contact-details`);
        
    } catch (error) {
        console.error("Error in email verification:", error);
        throw new ApiError(500, "Internal Server Error");
    }
});

// Serve Contact Details Page
const contactDetails = asyncHandler(async (req, res) => {
    res.render("contactDetails"); // Pass it to the template
});

const resetPasswordPage = asyncHandler(async(req,res) =>{
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
            return res.status(400).json({ error: "Invalid pincode. Unable to fetch latitude and longitude." });
        }

        console.log("Latitude:", location.lat);
        console.log("Longitude:", location.lon);

        // Extract latitude and longitude
        const lat = location.lat;
        const lon = location.lon;

        console.log("Full Name:", name);
        console.log("Address:", address);
        console.log("Pin Code:", pinCode);
        console.log("Phone Number:", phone);

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
    console.log(email, password)

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
        secure: true
    }

    console.log(user);

    //Set up session (implementation not shown)
    switch (user.role) {
        case 'User':
            res.status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", refreshToken, options)
                .json({ success: true, redirectUrl: "/api/v1/user-dashboard" });
            break;
        case 'SPHead':
            res.json({ success: true, redirectUrl: "/sphead-dashboard" });
            break;
        case 'Admin':
            res.json({ success: true, redirectUrl: "/admin-dashboard" });
            break;
        case 'SuperAdmin':
            res.json({ success: true, redirectUrl: "/superadmin-dashboard" });
            break;
        default:
            res.status(403).json({ success: false, message: "Unauthorized access" });
    }


    // return res.status(200)
    //     .cookie("accessToken", accessToken, options)
    //     .cookie("refreshToken", refreshToken, options)
    //     .json({
    //         status: "success",
    //         message: "Login successful",
    //         user: {
    //             id: user._id,
    //             email: user.email,
    //             role: user.role
    //         },
    //         accessToken,
    //         refreshToken
    //     });
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

const getLoggedInUserDetails = asyncHandler(async (req,res) => {
    try {
        const userDetails = await User.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(userId) }
            },
            {
                $lookup: {
                    from: "eventrequests",
                    localField: "_id",
                    foreignField: "user",
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

const userDashboard = asyncHandler(async(req,res) => {
    const user = req.user;
    const events = undefined;
    res.render('userDashboard',{user,events});
})
const addEvent = asyncHandler(async(req,res) => {
    res.render('addEvent');
});

const registerEvent = asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
        throw new ApiError("User not found")
    }

    const { eventType, requested_date, requested_time, description } = req.body;
    console.log("Event"+ eventType,"\nRequested Date : "+ requested_date,"\nRequested Time : "+ requested_time)

    if ([eventType, requested_date, requested_time, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All Fields are required")
    }

    const requestedEvent = await EventRequest.create({
        user_id: user._id,
        eventType,
        requested_date,
        requested_time,
        description
    })

    if (!requestedEvent) {
        throw new ApiError("Event registration failed. Please retry.")
    }

    const eventAssignedTo = await getNearestSPHead(user.lat, user.lon, user.state, user.district);

    if (!eventAssignedTo) {
        return new ApiResponse(200,{},"Event request is not available at your place")
    }

    console.log(eventAssignedTo);
    return res.status(200)
        .json({
            success: true,
            message: "User Registration completed, Data saved Succesfully",
            redirectUrl: `/api/v1/user-dashboard`
    });

})


export {
    dashboard,
    login,
    signUp,
    contactDetails,
    verifyEmailPage,
    resetPasswordPage,
    userDashboard,
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
    registerEvent
};