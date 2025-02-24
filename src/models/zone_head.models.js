import mongoose from "mongoose";

const ZoneHeadSchema = new mongoose.Schema(
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

const ZoneHead = mongoose.model("ZoneHead", ZoneHeadSchema);
export default ZoneHead;
