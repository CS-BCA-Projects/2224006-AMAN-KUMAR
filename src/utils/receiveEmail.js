import nodemailer from "nodemailer";
import { ApiError } from "./ApiError.js";

const receiveEmail = async (from, subject, html) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER, // Your email
                pass: process.env.EMAIL_PASS, // Use App Password if using Gmail
            },
        });

        const mailOptions = {
            from, // Sender (user's email)
            to: process.env.EMAIL_USER, // Your email (Admin)
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        throw new ApiError(500,"Error sending email:", error);
    }
};

export default receiveEmail;
