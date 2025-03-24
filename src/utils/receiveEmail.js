import nodemailer from "nodemailer";

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
        console.log("Email sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
};

export default receiveEmail;
