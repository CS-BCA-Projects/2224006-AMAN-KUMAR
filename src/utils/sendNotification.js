import Notification from "../models/notification.models.js";
import { ApiError } from "./ApiError.js";

const sendNotification = async (userId, message) => {
    try {
        const notification = new Notification({
            user: userId,
            message,
            status: "Sent",
        });
        await notification.save();
        return notification;
    } catch (error) {
        throw new ApiError(400,"Notification failed to send");
    }
};
export {sendNotification};