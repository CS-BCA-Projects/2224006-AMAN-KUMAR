import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
            enum: ["User", "ZoneHead", "Admin", "SuperAdmin"], 
            default: "User"
        },
        status: { 
            type: String, 
            enum: ["Active", "Inactive"], 
            default: "Active" 
        },
        recentEventRequest : [
            {
                type : mongoose.Schema.Types.ObjectId,
                ref : "EventRequest"
            }
        ],
        pastEventRequest : [
            {
                type : mongoose.Schema.Types.ObjectId,
                ref : "EventRequest"
            }
        ],
        refreshToken:{
            type: String,
        }

    }, { timestamps: true }
);

UserSchema.plugin(mongooseAggregatePaginate);

// Hash password before saving
UserSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    
    this.password = await bcrypt.hash(this.password, 10); // Async password hashing
    next();
});

// Correcting the method definition
UserSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
};

// Generate Access Token
UserSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        { id: this._id, email: this.email, role: this.role }, 
        process.env.ACCESS_TOKEN_KEY, 
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

// Generate Refresh Token
UserSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        { id: this._id, email: this.email }, 
        process.env.REFRESH_TOKEN_SECRET, 
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

const User = mongoose.model("User", UserSchema);

export default User;
