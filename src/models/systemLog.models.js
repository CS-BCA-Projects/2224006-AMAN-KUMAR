import mongoose from "mongoose";

const SystemLogSchema = new mongoose.Schema(
  {
    action: { 
      type: String, 
      required: true 
    },
    performedBy: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "User" 
    },
    timestamp: { 
      type: Date, 
      default: Date.now 
    }
  }
)
;

const SystemLog = mongoose.model("SystemLog", SystemLogSchema);
export default SystemLog;
