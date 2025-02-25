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
            enum: ["User", "ZoneHead", "Admin", "SuperAdmin"], 
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
            type:String,
        }

    }, {timestamps : true}
);

UserSchema.plugin(mongooseAggregatePaginate);

UserSchema.pre("save", function(next) {
    if(!this.isModified("password")) return next() // if password was not modified just return it not execute the fun
    
    this.password = bcrypt.hash(this.password,10) //hashing the password
    next()
})

UserSchema.method.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password)
}

UserSchema.methods.generateAccessToken = function (){
    return jwt.sign(
        {
            email:this.email
        },
        process.env.ACCESS_TOKEN_KEY,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

UserSchema.methods.generateRefreshToken = function (){
    return jwt.sign(
        {
            email:this.email
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

const User = mongoose.model("User", UserSchema);

export default User;
