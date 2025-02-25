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
        lat : {
            type : Number,
            required : true
        },
        lon : {
            type : Number,
            required : true
        },
        zone: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Zone" 
        },
    }
);

const ContactDetails = mongoose.model("ContactDetails", contactDetailSchema);

export {ContactDetails};
