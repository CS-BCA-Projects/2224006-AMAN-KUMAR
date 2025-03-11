import mongoose from "mongoose";

const EventRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: String,
      required: true
    }
    ,
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
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
      enum: ['Pending', 'Approved', 'Assigned', 'Completed', 'Rejected'],
      default: 'Pending'
    },
    assignedTo: {
      type: String,
    },
    description: {
      type: String,
      required: true
    }
  }, { timestamps: true }
);

const EventRequest = mongoose.model("EventRequest", EventRequestSchema);
export default EventRequest;
