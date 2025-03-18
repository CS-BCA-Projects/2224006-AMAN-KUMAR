import Notification from "../models/notification.models.js";

const sendNotification = async (userId, message) => {
    try {
        const notification = new Notification({
            user: userId,
            message,
            status: "Sent",
        });
        await notification.save();
        console.log(`Notification sent to user ${userId}: ${message}`);
        return notification;
    } catch (error) {
        console.error("Error sending notification:", error);
        throw new Error("Notification failed to send");
    }
};
export {sendNotification};