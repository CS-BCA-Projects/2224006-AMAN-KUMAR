import nodemailer from 'nodemailer';
import { ApiError } from './ApiError.js';

const sendEmail = async (from,to, subject, html) => {
    try {
        const transporter = nodemailer.createTransport({
            service : "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });
        
        

        const mailOptions = {
            from,
            to,
            subject,
            html,
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        throw new ApiError("Error sending email:", error);
    }
};

export default sendEmail;
 