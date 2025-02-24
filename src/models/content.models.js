import mongoose from "mongoose";

const ContentSchema = new mongoose.Schema(
    {
        title: { 
            type: String, 
            required: true 
        },
        content: {
            type: String, 
            required: true 
        },
        lastUpdated: { 
            type: Date, 
            default: Date.now 
        },
    }
);

const Content = mongoose.model("Content", ContentSchema);
export default Content;
