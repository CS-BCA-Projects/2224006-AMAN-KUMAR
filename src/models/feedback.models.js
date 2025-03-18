import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    message: { 
      type: String, 
      required: true 
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
  }
);

const Feedback = mongoose.model("Feedback", FeedbackSchema);
export default Feedback;
