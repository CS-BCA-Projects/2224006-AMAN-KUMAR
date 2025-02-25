import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from "../utils/ApiError.js";
import User from "../models/user.models.js"
import { ContactDetails } from '../models/contact_details.models.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { findLanLon } from '../utils/extractLatLon.js';

const registerUser = asyncHandler(async (req, res) => {
    // get  user details from frontend

    const {email,password} = req.body;
    console.log("Email : ",email + "Password : ",password);

    //validate the filelds

    if(
        [email,password].some((field) => 
            field?.trim() === "")
    ){
        throw new ApiError(400,"All Fields are required")
    }

    const existedUser = await User.findOne({email});

    if(existedUser){
        throw new ApiError(409, "User already exists")
    }

    const user = await User.create({
        email,
        password
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering a user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully")
    )
});

const feedContact = asyncHandler(async (req, res) => {
    // Get user details from frontend
    const { name, address, pinCode, phone } = req.body;
    
    // Validate fields
    if ([name, address, pinCode, phone].some((field) => field?.trim() === "")) {
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
            name,
            address,
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

export {registerUser,feedContact};