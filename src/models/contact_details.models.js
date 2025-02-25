import mongoose from 'mongoose';

const contactDetailSchema = new mongoose.Schema(
    {
        user : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User"
        },
        name: { 
            type: String, 
            required: true 
        },
        phone: { 
            type: String, 
            required: true, 
            unique: true 
        },
        address : {
            type : String,
            required : true,
        },
        pinCode : {
            type : String,
            required : true,
            max : 8
        },
        zone: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Zone" 
        },
    }
);