import mongoose from "mongoose";

const SPHeadSchema = new mongoose.Schema(
    {
        name: { 
            type: String, 
            required: true 
        },
        email: { 
            type: String, 
            required: true, 
            unique: true,
            lowercase : true
        },
        password: {
            type: String,
            default : "gurudev123"
        },
        phone: { 
            type: String, 
            required: true, 
            unique: true 
        },
        zone: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Zone", 
            required: true 
        },
        assignedAt: { 
            type: Date, 
            default: Date.now 
        },
    }
);
SPHeadSchema.plugin(mongooseAggregatePaginate);

SPHeadSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next() // if password was not modified just return it not execute the fun

    this.password = await bcrypt.hash(this.password, 10) //hashing the password
    next()
})

SPHeadSchema.method.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

SPHeadSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            email: this.email
        },
        process.env.ACCESS_TOKEN_KEY,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

SPHeadSchema.methods.generateRefreshToken = function () {
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

const SPHead = mongoose.model("SPHead", SPHeadSchema);
export default SPHead;
