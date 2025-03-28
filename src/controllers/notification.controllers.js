import Notification from "../models/notification.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getUserNotifications = asyncHandler( async (req, res) => {
    try {
        const userId = req.user._id;
        const notifications = await Notification.find({ user: userId }).sort({ sentAt: -1 });

        res.render('notification',{notifications})
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch notifications" });
    }
});
const deleteNotification = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findByIdAndDelete(id);

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        return res.status(200).json({ success: true, message: "Notification deleted successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error deleting notification" });
    }
});

const notificationCount = asyncHandler(async (req,res) => {
    const userId = req.user._id; // Get logged-in user's ID
    const unreadCount = await Notification.countDocuments({user : userId});

    res.status(200).json({ count: unreadCount });
})

export {
    getUserNotifications,
    deleteNotification,
    notificationCount
}