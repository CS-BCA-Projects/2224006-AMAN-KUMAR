import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from "../utils/ApiError.js";
import User from "../models/user.models.js"
import { ApiResponse } from '../utils/ApiResponse.js';

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


export {registerUser};