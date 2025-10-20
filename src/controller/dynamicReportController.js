import {
  initializeConnection,
  closeConnection,
  executeQuerySpData,
} from "../config/DBConfig.js";
import puppeteer from "puppeteer";

const looksLikeJson = (s) =>
  typeof s === "string" && !!s.trim() && /^[\[{]/.test(s.trim());

const getFirstRecordset = (raw) =>
  Array.isArray(raw)
    ? raw
    : raw?.recordset ||
    (Array.isArray(raw?.recordsets) ? raw.recordsets[0] : []) ||
    [];

const extractJsonString = (row) => {
  if (!row) return null;
  const JSON_COL = "JSON_F52E2B61-18A1-11d1-B105-00805F49916B";
  if (typeof row[JSON_COL] === "string") return row[JSON_COL];
  const key = Object.keys(row).find(
    (k) => typeof row[k] === "string" && looksLikeJson(row[k])
  );
  return key ? row[key] : null;
};

const parseForJsonRecordset = (raw) => {
  const rs = getFirstRecordset(raw);
  if (!rs?.length) return [];
  const jsonStr = extractJsonString(rs[0]);
  if (looksLikeJson(jsonStr)) {
    try {
      return JSON.parse(jsonStr);
    } catch { }
  }
  return rs;
};

const toJsonParam = (input) => {
  if (input == null) return null;
  if (typeof input === "string") return input;
  if (Array.isArray(input)) return input.map(String).join(",");
  if (typeof input === "object" && typeof input.json === "string")
    return input.json;
  if (typeof input === "object" && Array.isArray(input.ids))
    return input.ids.map(String).join(",");
  return String(input);
};

export const dynamicReportUpdate = async (req, res) => {
  const spName = req.body?.spName || req.body?.spname;
  const { jsonData } = req.body;

  if (
    !spName ||
    typeof spName !== "string" ||
    !/^[A-Za-z0-9_.]+$/.test(spName)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid or missing 'spName'. Only letters, numbers, underscore, and dot are allowed.",
    });
  }

  const items = Array.isArray(jsonData)
    ? jsonData
    : jsonData && typeof jsonData === "object"
      ? [jsonData]
      : [];

  if (items.length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "No jsonData supplied. Provide 'jsonData' as an object or array of objects.",
    });
  }

  try {
    await initializeConnection();

    const results = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const payload = JSON.stringify(items[i] ?? {});
        const sqlText = `EXEC ${spName} @json = @jsonData`;
        const raw = await executeQuerySpData(sqlText, { jsonData: payload });

        const data = parseForJsonRecordset(raw);

        results.push({
          index: i,
          ok: true,
          data,
          rowsAffected: raw?.rowsAffected ?? null,
        });
      } catch (err) {
        results.push({
          index: i,
          ok: false,
          error: err?.message || "Stored procedure execution failed.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      spName,
      count: results.length,
      results,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to execute stored procedure.",
      error: err?.message,
    });
  } finally {
    await closeConnection();
  }
};

const execOnceJson = async (spName, uiPayload) => {
  const payload =
    uiPayload === null || uiPayload === undefined
      ? null
      : typeof uiPayload === "string"
        ? uiPayload
        : JSON.stringify(uiPayload);

  const sqlText = `EXEC ${spName} @filterCondition = @jsonData`;
  const raw = await executeQuerySpData(sqlText, { jsonData: payload });
  const rs = getFirstRecordset(raw);
  if (!rs?.length) {
    const e = new Error("Stored procedure returned no rows.");
    e.raw = JSON.stringify(raw ?? {});
    throw e;
  }

  const row0 = rs[0];
  const firstColName = row0 && Object.keys(row0)[0];
  const jsonStr =
    row0?.json ??
    row0?.data ??
    (firstColName && typeof row0[firstColName] === "string"
      ? row0[firstColName]
      : null);

  if (typeof jsonStr !== "string") {
    const e = new Error(
      "Stored procedure did not return a JSON string in the first row."
    );
    e.raw = JSON.stringify(row0 ?? {});
    throw e;
  }

  const trimmed = jsonStr.trim();
  if (!trimmed || !/^[\[{]/.test(trimmed)) {
    const e = new Error("Stored procedure did not return valid JSON text.");
    e.raw = jsonStr;
    throw e;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const err = new Error("Stored procedure output is not valid JSON.");
    err.raw = jsonStr;
    throw err;
  }
};

export const getSpData = async (req, res) => {
  const spName = req.body?.spName || req.body?.spname;
  const { jsonData } = req.body;

  if (
    !spName ||
    typeof spName !== "string" ||
    !/^[A-Za-z0-9_.]+$/.test(spName)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid stored procedure name. Only letters, numbers, underscore, and dot are allowed.",
    });
  }

  try {
    await initializeConnection();

    const items = Array.isArray(jsonData)
      ? jsonData
      : jsonData && typeof jsonData === "object"
        ? [jsonData]
        : [{}];

    if (items.length === 1) {
      const parsed = await execOnceJson(spName, items[0]);
      return res.status(200).json({ success: true, spName, data: parsed });
    }

    const batch = [];
    for (const item of items) {
      const parsed = await execOnceJson(spName, item);
      batch.push(parsed);
    }
    return res.status(200).json({
      success: true,
      spName,
      batch: true,
      count: batch.length,
      data: batch,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error executing stored procedure.",
      error: err.message,
      ...(err.raw ? { raw: err.raw } : {}),
    });
  } finally {
    await closeConnection();
  }
};

export const getIgmBlData = async (req, res) => {
  try {
    await initializeConnection();

    const body =
      typeof req.body === "object" && "jsonData" in req.body
        ? req.body.jsonData
        : req.body;

    const payload = toJsonParam(body);
    if (!payload || !String(payload).trim()) {
      return res.status(400).json({
        success: false,
        message:
          'Provide IDs as { "jsonData": { "json": "5770,5771" } } or { "jsonData": { "ids": [5770,5771] } } or "5770,5771".',
      });
    }

    const sqlText = `EXEC igmBldata @json = @jsonData`;
    const raw = await executeQuerySpData(sqlText, { jsonData: payload });

    const data = parseForJsonRecordset(raw);
    return res.status(200).json({
      success: true,
      spName: "igmBldata",
      count: Array.isArray(data) ? data.length : 0,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to execute igmBldata.",
      error: err?.message,
    });
  } finally {
    await closeConnection();
  }
};

export const localPDFReports = async (req, res) => {
  try {
    const {
      htmlContent = "",
      orientation = "portrait",
      pdfFilename = "report",
      extraStyles = "",
      cssUrls = []
    } = req.body || {};

    // quick sanity checks + debug
    console.log("localPDFReports content-type:", req.headers["content-type"]);
    console.log("localPDFReports body keys:", Object.keys(req.body || {}));
    if (!htmlContent || typeof htmlContent !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "htmlContent is required (string)" });
    }

    // fetch Tailwind (best-effort; won't block if CDN fails)
    let tailwindCSS = "";
    try {
      const r = await fetch(
        "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
        { cache: "no-store" }
      );
      tailwindCSS = await r.text();
    } catch { /* ignore */ }

    const fullStyledHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
          <style>
            @page { margin: 10px; }
            body { font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
            ${tailwindCSS}
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      ...(process.env.NODE_ENV === "production" || process.env.PUPPETEER_EXECUTABLE_PATH
        ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium" }
        : {}),
    });

    const page = await browser.newPage();

    // avoid networkidle0 stalls
    await page.setContent(fullStyledHtml, { waitUntil: "domcontentloaded", timeout: 60000 });

    // wait for images, but cap wait so it never hangs
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      const waitAll = Promise.all(
        imgs.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise(r => { img.onload = img.onerror = r; })
        )
      );
      const cap = new Promise(r => setTimeout(r, 4000));
      await Promise.race([waitAll, cap]);
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      landscape: orientation === "landscape",
      margin: { top: "10px", bottom: "10px", left: "10px", right: "10px" },
    });

    await browser.close();

    const safeName = String(pdfFilename || "report").replace(/[\\/:*?"<>|]+/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.pdf"`);
    res.end(pdfBuffer, "binary");
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while generating the PDF",
      error: String(error),
    });
  }
};

export const getBlDataForDO = async (req, res) => {
  const toInt = (v) => {
    if (v === undefined || v === null) return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };

  try {
    await initializeConnection();

    // accept from body or query
    const rawId = req.body?.id ?? req.query?.id;
    const rawClientId = req.body?.clientId ?? req.query?.clientId;

    const id = toInt(rawId);
    const clientId = toInt(rawClientId);

    if (id === null || clientId === null) {
      return res.status(400).json({
        success: false,
        message:
          "Both 'id' and 'clientId' must be numbers (e.g., 5770 and 8).",
        received: { id: rawId, clientId: rawClientId },
      });
    }

    const sqlText = `EXEC dbo.blDataForDO @id = @id, @clientId = @clientId`;
    const raw = await executeQuerySpData(sqlText, { id, clientId });

    const data = parseForJsonRecordset(raw);

    return res.status(200).json({
      success: true,
      spName: "dbo.blDataForDO",
      count: Array.isArray(data) ? data.length : 0,
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to execute blDataForDO.",
      error: err?.message,
    });
  } finally {
    await closeConnection();
  }
};


