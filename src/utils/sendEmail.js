import nodemailer from 'nodemailer';

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
        console.error("Error sending email:", error);
        return false;
    }
};

export default sendEmail;
 