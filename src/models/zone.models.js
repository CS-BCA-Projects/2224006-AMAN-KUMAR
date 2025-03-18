import mongoose, {Schema} from "mongoose";

const ZoneSchema = new mongoose.Schema(
  {
    region: { 
      type: String, 
      required: true 
    },
    userInZone : {
      type : Schema.Types.ObjectId,
      ref : "User"
    }
  }, {timestamps : true}
);

const Zone = mongoose.model("Zone", ZoneSchema);

export default Zone;
