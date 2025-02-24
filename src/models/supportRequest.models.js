import mongoose from "mongoose";

const SupportRequestSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    issueType: { 
      type: String, 
      required: true 
    },
    status: { 
      type: String, 
      enum: ["Open", "Resolved", "Closed"], 
      default: "Open" 
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
  }
);

const SupportRequest = mongoose.model("SupportRequest", SupportRequestSchema);
export default SupportRequest;
