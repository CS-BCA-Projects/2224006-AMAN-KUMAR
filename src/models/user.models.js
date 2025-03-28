import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const UserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        role: { 
            type: String, 
            enum: ["User", "SPHead", "Admin", "SuperAdmin"], 
            default: "User" 
        },
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active"
        },
        name: { 
            type: String, 
        },
        phone: { 
            type: String
        },
        state : {
            type : String,
            enum: [
                "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
                "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
                "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
                "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
                "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
                "Uttarakhand", "West Bengal",
                "Andaman and Nicobar Islands", "Chandigarh",
                "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
                "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
            ],
        },
        district : {
            type : String,
        },
        address : {
            type : String,
        },
        pinCode : {
            type : String,
            max : 8
        },
        lat : {
            type : Number,
        },
        lon : {
            type : Number,
        },
        zone: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Zone" 
        },
        allEvents : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "EventRequest"
        },
        isVerified: { 
            type: Boolean,
            default: false 
        },
        verificationToken: { 
            type: String 
        },
        verificationTokenExpires: { 
            type: Date 
        },
        refreshToken: {
            type: String,
        },

    }, { timestamps: true }
);

UserSchema.plugin(mongooseAggregatePaginate);

UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next() // if password was not modified just return it not execute the fun

    if (!this.password) {
        if (this.role === "SPHead" || this.role === "Admin") {
            this.password = "gurudev123";  // Set default password
        } else {
            return next();
        }
    }

    this.password = await bcrypt.hash(this.password, 10) //hashing the password
    next()
})

UserSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

UserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id : this._id,
            email: this.email,
            role: this.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

UserSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id : this._id,
            email : this.email
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

const User = mongoose.model("User", UserSchema);

export default User;
