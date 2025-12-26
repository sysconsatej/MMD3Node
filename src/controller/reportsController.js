// src/controller/reportsController.js
import puppeteer from "puppeteer";
import nodemailer from "nodemailer";
import crypto from "crypto";
import fs from "fs";
import fetch from "node-fetch";

// ====== ENV helper ======
const env = (
  key,
  { required = false, stripSpaces = false, fallback = "" } = {}
) => {
  let v = (process.env[key] ?? fallback).toString().trim();
  if (stripSpaces) v = v.replace(/\s+/g, "");
  if (required && !v) throw new Error(`Missing env: ${key}`);
  return v;
};

// ====== SINGLETONS (warm) ======
let BROWSER_PROMISE = null;
let TRANSPORTER = null;
let SMTP_READY = false;
let CACHED_TAILWIND = null;

// OPTIONAL: pre-bundle a minimal CSS instead of full Tailwind for speed
const MIN_CSS = `
  @page { margin: 10px; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif; }
`;

// Boot a warm Chromium once
async function getBrowser() {
  if (!BROWSER_PROMISE) {
    BROWSER_PROMISE = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      ...(process.env.NODE_ENV === "production" ||
        process.env.PUPPETEER_EXECUTABLE_PATH
        ? {
          executablePath:
            `${process.env.PUPPETEER_EXECUTABLE_PATH}` || "/usr/bin/chromium",
        }
        : {}),
    });
  }
  return BROWSER_PROMISE;
}

// Reuse a pooled SMTP connection
function getTransporter() {
  if (TRANSPORTER) return TRANSPORTER;

  const host = env("SMTP_HOST", { fallback: "smtp.gmail.com" });
  const port = Number(env("SMTP_PORT", { fallback: "587" }));
  const user = env("SMTP_USER", { required: true });
  const pass = env("SMTP_PASS", { required: true, stripSpaces: true });
  const secure = port === 465;

  TRANSPORTER = nodemailer.createTransport({
    host,
    port,
    secure, // 465 = true, 587 = false
    auth: { user, pass },
    requireTLS: !secure, // enforce STARTTLS on 587
    pool: true, // keep alive
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 15000,
    greetingTimeout: 8000,
    socketTimeout: 20000,
    tls: { servername: host },
    family: 4, // force IPv4 (avoids some IPv6 issues)
  });

  return TRANSPORTER;
}

// Verify SMTP once (on first use). On failure, we’ll skip PDF work fast.
async function ensureSmtpReady() {
  if (SMTP_READY) return true;
  const t = getTransporter();
  try {
    await t.verify();
    SMTP_READY = true;
  } catch (e) {
    SMTP_READY = false;
  }
  return SMTP_READY;
}

// Cache Tailwind once, or fall back to MIN_CSS instantly
async function getCss() {
  if (CACHED_TAILWIND !== null) return CACHED_TAILWIND;
  // FAST PATH: don’t fetch CDN unless you truly need it
  if (process.env.USE_TAILWIND_CDN !== "true") {
    CACHED_TAILWIND = MIN_CSS;
    return CACHED_TAILWIND;
  }
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
      { cache: "no-store" }
    );
    CACHED_TAILWIND = `${MIN_CSS}\n${await res.text()}`;
  } catch {
    CACHED_TAILWIND = MIN_CSS;
  }
  return CACHED_TAILWIND;
}

// ====== CONTROLLER ======
export const emailPdfReports = async (req, res) => {
  const t0 = Date.now();
  let page;
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
    } = req.body || {};

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

    // Verify SMTP quickly BEFORE heavy PDF work
    const smtpReady = await ensureSmtpReady();
    if (!smtpReady) {
      return res.status(502).json({
        success: false,
        message: "SMTP not available (verify failed). Check credentials/ports.",
      });
    }

    // Build HTML
    const css = await getCss();
    const docHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${css}</style>
</head>
<body>${htmlContent}</body>
</html>`;

    // Puppeteer work (warm browser, single new page)
    const browser = await getBrowser();
    page = await browser.newPage();

    // Block 3rd-party requests you don’t need for PDF speed (fonts/analytics/etc.)
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      const type = req.resourceType();
      if (
        type === "font" ||
        (type === "stylesheet" && process.env.USE_TAILWIND_CDN !== "true") ||
        url.includes("google-analytics.com") ||
        url.startsWith("https://fonts.googleapis.com/") ||
        url.startsWith("https://fonts.gstatic.com/")
      ) {
        return req.abort();
      }
      return req.continue();
    });

    // Set content – `domcontentloaded` is usually enough; avoid networkidle0
    await page.setContent(docHtml, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    // Bounded image wait (don’t hang forever)
    await page.evaluate(() => {
      const imgs = Array.from(document.images);
      return Promise.race([
        Promise.all(
          imgs.map(
            (img) =>
              img.complete ||
              new Promise((resolve) => {
                img.onload = img.onerror = resolve;
              })
          )
        ),
        new Promise((resolve) => setTimeout(resolve, 3000)), // 3s cap
      ]);
    });

    // Render PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      landscape: orientation === "landscape",
      margin: { top: "10px", bottom: "10px", left: "10px", right: "10px" },
      preferCSSPageSize: true,
    });
    // Email send (pooled)
    const host = env("SMTP_HOST", { fallback: "smtp.gmail.com" });
    const port = Number(env("SMTP_PORT", { fallback: "587" }));
    const user = env("SMTP_USER", { required: true });
    const fromAddr = from || env("SMTP_FROM", { fallback: user });
    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from: fromAddr,
      to,
      cc,
      bcc,
      subject,
      text: emailText,
      html: emailHtml,
      attachments: [
        {
          // small hash in filename to avoid some client-side caching quirks
          filename: `${pdfFilename}-${crypto
            .randomBytes(3)
            .toString("hex")}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    const t1 = Date.now();
    return res.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      timingsMs: {
        total: t1 - t0,
      },
      smtp: { host, port, pooled: true },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while generating/sending the PDF",
      error: error?.message || String(error),
    });
  } finally {
    try {
      if (page) await page.close(); // keep browser warm
    } catch { }
  }
};
