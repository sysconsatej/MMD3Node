import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_Test,
    pass: process.env.SMTP_pass_Test,
  },
});

export async function sendInvoiceEmail(req, res) {
  try {
    const {
      to,
      subject,
      emailHtml,
      emailText,
      attachmentPaths = [],
    } = req.body;

    const attachments = [];
    const missingFiles = [];

    for (const file of attachmentPaths) {
      const filePath = path.join(__dirname, "../../uploads", file);

      if (fs.existsSync(filePath)) {
        attachments.push({
          filename: file,
          path: filePath,
        });
      } else {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "No attachments sent. The following files were not found in the system: ",
        missingFiles,
      });
    }

    const mailOptions = {
      from: process.env.SMTP_Test,
      to,
      subject,
      text: emailText,
      html: emailHtml,
      attachments,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Invoice email sent successfully",
    });
  } catch (error) {
    console.error("Email Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send invoice email",
    });
  }
}
