import mongoose from "mongoose";

const ZoneSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true 
    },
    region: { 
      type: String, 
      required: true 
    }
  }, {timestamps : true}
);

const Zone = mongoose.model("Zone", ZoneSchema);

export default Zone;
