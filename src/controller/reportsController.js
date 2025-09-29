// src/controller/reportsController.js
import puppeteer from "puppeteer";
import nodemailer from "nodemailer";

// Node 18+ has global fetch; if you need a fallback, you can dynamic-import node-fetch.

export const emailPdfReports = async (req, res) => {
  try {
    const {
      htmlContent,
      orientation = "portrait",
      pdfFilename = "Cargo Arrival Notice",
      to,
      cc,
      bcc,
      subject = "Cargo Arrival Notice",
      emailHtml = "<p>Please find the attached report.</p>",
      emailText,
      from,
    } = req.body;

    if (!htmlContent) {
      return res
        .status(400)
        .json({ success: false, message: "htmlContent is required" });
    }
    if (!to) {
      return res
        .status(400)
        .json({ success: false, message: "to (recipient) is required" });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const tailwindCSS = await fetch(
      "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
    ).then((r) => r.text());

    const fullStyledHtml = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
<style>
${tailwindCSS}
body { font-family: 'Inter', sans-serif; }
@page { margin: 10px; }
</style>
</head><body>${htmlContent}</body></html>`;

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(fullStyledHtml, { waitUntil: "networkidle0" });

    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map(
          (img) =>
            img.complete ||
            new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            })
        )
      );
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      landscape: orientation === "landscape",
      margin: { top: "10px", bottom: "10px", left: "10px", right: "10px" },
    });

    await browser.close();

    const info = await transporter.sendMail({
      from:
        from ||
        process.env.SMTP_FROM ||
        process.env.SMTP_USER ||
        "no-reply@example.com",
      to,
      cc,
      bcc,
      subject,
      text: emailText,
      html: emailHtml,
      attachments: [
        {
          filename: `${pdfFilename}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return res.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (error) {
    console.error("Error generating/sending PDF:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while generating/sending the PDF",
      error: error?.message || String(error),
    });
  }
};
