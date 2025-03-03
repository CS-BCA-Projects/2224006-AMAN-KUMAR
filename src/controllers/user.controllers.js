import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.models.js"
import { ContactDetails } from '../models/contact_details.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { findLanLon } from '../utils/extractLatLon.js';
import jwt from "jsonwebtoken"

import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';


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

const registerUser = asyncHandler(async (req, res) => {
    // get  user details from frontend

    const { email, password } = req.body;
    console.log("Email : ", email + "Password : ", password);

    //validate the filelds

    if (
        [email, password].some((field) =>
            field?.trim() === "")
    ) {
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

    return res.status(201).json(
        new ApiResponse(201, null, "Check your email to verify your account.")
    );
});

const verifyEmail = asyncHandler(async (req, res) => {
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
    let user;
    try {
        user = await User.create({
            email: storedUser.email,
            password: storedUser.password, // Already hashed
            isVerified: true,
        });
    } catch (error) {
        console.error("User creation error:", error);
        throw new ApiError(500, "User could not be created in MongoDB");
    }

    // Ensure user is defined before proceeding
    if (!user) {
        throw new ApiError(500, "User creation failed, please try again.");
    }

    // Remove from temporary storage
    unverifiedUsers.delete(token);

    const options = {
        httpOnly: true,
        secure: true
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // Fetch the newly created user
    const createdUser = await User.findById(user._id).select("-password");


    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while retrieving the saved user.");
    }

    return res.status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(201, createdUser, "Email verified successfully. User registered.")
    );
});

const feedContact = asyncHandler(async (req, res) => {
    // Get user details from frontend
    console.log(req.body);
    const { name, address,state,district, pinCode, phone } = req.body;

    // Validate fields
    if ([name,address,state,district,pinCode,phone].some((field) => field?.trim() === "")) {
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

        //Store data in database
        const contacts = await ContactDetails.create({
            user_id : req.user_id,
            name,
            address,
            state,
            district,
            pinCode,
            phone,
            lat,
            lon
        });

        if (!contacts) {
            throw new ApiError(500, "Something went wrong while registering user contact details");
        }

        return res.status(201).json(
            new ApiResponse(200, contacts, "User contact details Registered Successfully")
        );

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

const loginUser = asyncHandler(async (req, res) => {
    //req body -> data
    // email find user
    //password check
    //access and refresh token
    //send cookie

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

    const loggeddInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    console.log(user);

    // Set up session (implementation not shown)
    // switch (user.role) {
    //     case 'User':
    //         res.json({ success: true, redirectUrl: "/user-dashboard" });
    //         break;
    //     case 'SPHead':
    //         res.json({ success: true, redirectUrl: "/sphead-dashboard" });
    //         break;
    //     case 'Admin':
    //         res.json({ success: true, redirectUrl: "/admin-dashboard" });
    //         break;
    //     case 'SuperAdmin':
    //         res.json({ success: true, redirectUrl: "/superadmin-dashboard" });
    //         break;
    //     default:
    //         res.status(403).json({ success: false, message: "Unauthorized access" });
    // }
    

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json({
            status: "success",
            message: "Login successful",
            user: {
                id: user._id,
                email: user.email,
                role: user.role
            },
            accessToken,
            refreshToken
        });

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
        .json(new ApiResponse(200,{},"Reset password link has been sent to your registered email Id"))

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

    const {email,newPassword} = storedUser;

    const user = await User.findOne({email});
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

const getCurrentUser = asyncHandler(async (req,res) => {
    return res.status(200)
    .json(new ApiResponse(200,
        req.user,
        "Current user fetched successsfully")
    )
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

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
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

export { registerUser, 
    feedContact, 
    verifyEmail, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    forgotPassword,
    resetPassword 
};