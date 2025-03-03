import mongoose from 'mongoose';

const contactDetailSchema = new mongoose.Schema(
    {
        user_id : {
            type : String,
            required : true
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
            required : true
        },
        district : {
            type : String,
            required : true
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
