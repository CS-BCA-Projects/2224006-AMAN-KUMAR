import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { ApiError } from './ApiError.js';

dotenv.config(); // Ensure environment variables are loaded

const sendEmail = async (to, subject, html) => {
    try {
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true, // True for 465, false for 587
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER, // Ensure sender is the authenticated user
            to,
            subject,
            html,
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        throw new ApiError(`Error sending email: ${error.message}`);
    }
};

export default sendEmail;
