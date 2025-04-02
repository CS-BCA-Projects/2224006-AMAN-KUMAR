import nodemailer from "nodemailer";
import { ApiError } from "./ApiError.js";

const receiveEmail = async (from, subject, html) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER, // Your email
                pass: process.env.EMAIL_PASS, // Use App Password if using Gmail
            },
        });

        const mailOptions = {
            from, // Sender (User's email)
            to: process.env.EMAIL_USER, // Your Admin Email
            subject,
            html,
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        throw new ApiError(`Error forwarding email: ${error.message}`);
    }
};

export default receiveEmail;
