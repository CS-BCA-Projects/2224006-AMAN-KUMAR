import EventRequest from "../models/eventRequest.models.js"; // Adjust based on your structure
import { ApiError } from "./ApiError.js";

const timeSlotExpiry = {
    "Morning": 12,  // 12:00 PM
    "Afternoon": 16, // 4:00 PM
    "Evening": 20, // 8:00 PM
    "Night": 23 // 11:59 PM
};

const updateExpiredEvents = async (userId) => {
    try {
        const currentDate = new Date();
        const currentHour = currentDate.getHours();

        // Find all pending events where the user is either:
        // - The requester (`requestedBy`)
        // - The assigned SPHead (`assignedTo`)
        const pendingEvents = await EventRequest.find({
            status: "Assigned",
            $or: [
                { requestedBy: userId },
                { assignedTo: userId }
            ]
        });

        let expiredEventIds = [];

        pendingEvents.forEach(event => {
            const eventDate = new Date(event.requested_date);
            const eventHourLimit = timeSlotExpiry[event.time_slot];

            // If the event date is in the past OR today's event has passed the scheduled time slot
            if (
                eventDate < currentDate ||
                (eventDate.toDateString() === currentDate.toDateString() && currentHour >= eventHourLimit)
            ) {
                expiredEventIds.push(event._id);
            }
        });

        if (expiredEventIds.length > 0) {
            await EventRequest.updateMany(
                { _id: { $in: expiredEventIds } },
                { $set: { status: "Rejected" } }
            );
        }
    } catch (error) {
        throw new ApiError(400,"Error updating expired events:", error);
    }
};

export {updateExpiredEvents}