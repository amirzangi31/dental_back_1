import "dotenv/config";
import nodemailer from "nodemailer";

const TARGET_EMAIL = "zangiabadi1378888@gmail.com";

async function sendWelcomeEmail() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    throw new Error("GMAIL_USER and GMAIL_PASS must be set in .env");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: TARGET_EMAIL,
    subject: "Dental Art",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Hello,</h2>
          
          <h3 style="color: #3498db;">Welcome to DigitDA.</h3>
          
          <p>Your account has been successfully created, and you are now part of a modern digital design experience built for precision, speed, and uncompromising quality.</p>
          
          <p>At DigitDA, every case is handled with advanced Dental Softwares expertise and attention to detail — because we believe digital dentistry should never be average.</p>
          
          <p>You can now log in, submit your cases, and experience a smarter workflow.</p>
          
          <p style="font-weight: bold; color: #27ae60;">We're excited to work with you.</p>
          
          <p style="margin-top: 30px;">
            Best regards,<br>
            <strong>Digital Dental Art</strong>
          </p>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Welcome email sent to: ${TARGET_EMAIL}`);
  process.exit(0);
}

sendWelcomeEmail().catch((err) => {
  console.error("Failed to send welcome email:", err);
  process.exit(1);
});
