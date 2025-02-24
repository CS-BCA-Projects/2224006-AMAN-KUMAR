import mongoose from "mongoose";

const EventRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true
    },
    eventType: {
      type: String,
      enum: ['Yagya', 'Deep Yagya', 'Lecture', 'Garbhadhan', 'Punsavan', 'Simantonayan', 'Jatkarma', 'Namkaran', 'Nishkramana', 'Annaprashan', 'Chaul', 'Vidyarambh', 'Karnavedh', 'Upanayan', 'Vedarambha', 'Keshanta', 'Samavartan', 'Vivah', 'Anthyeshti'],
      required: true
    },
    requested_date: {
      type: Date,
      required: true
    },
    requested_time: {
      type: String,
      require: true,
      enum: ['Morning', 'Afternoon', 'Evening', 'Night']
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Assigned', 'Completed'],
      default: 'Pending'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ZoneHead"
    },
  }, {timestamps : true}
);

const EventRequest = mongoose.model("EventRequest", EventRequestSchema);
export default EventRequest;
