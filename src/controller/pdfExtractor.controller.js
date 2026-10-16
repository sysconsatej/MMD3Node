
import { PDFParse } from "pdf-parse";
import { executeQuery } from "../config/DBConfig.js";

import {
  PDF_EXTRACTOR_CONFIG,
  MAX_PDF_FILE_SIZE,
} from "../config/pdfExtractor.config.js";
import fs from "node:fs/promises";
import { saveInvoicePdf } from "../utils/pdfExtractor/invoicePdfStorage.js";

import {
  extractInvoiceFields,
} from "../utils/pdfExtractor/invoiceFieldRules.js";

const MAX_FILES = PDF_EXTRACTOR_CONFIG.maxFilesPerRequest;
const MAX_FILE_SIZE = MAX_PDF_FILE_SIZE;

async function extractPdfText(buffer) {
  const parser = new PDFParse({
    data: new Uint8Array(buffer),
  });

  try {
    const result = await parser.getText();

    const text = (result.text || "")
      .replace(/\uFFFD/g, " ")
      .replace(/\u00A0/g, " ");

    const pageCount = result.total || result.pages?.length || 0;
    const characterCount = text.trim().length;

    return {
      text,
      pageCount,
      characterCount,
      method: "PDF_TEXT",
      status: characterCount > 0 ? "SUCCESS" : "OCR_REQUIRED",
      error: null,
    };
  } finally {
    await parser.destroy();
  }
}

//Extraction of PDF files and returning the extracted text and invoice data
export async function extractPdfs(req, res) {
  try {
    console.log("PDF REQUEST RECEIVED:", {
      contentType: req.headers["content-type"],
      filesReceived: Object.keys(req.files || {}),
    });

    const uploaded = req.files?.files;

    if (!uploaded) {
      return res.status(400).json({
        success: false,
        message: "No PDF files received.",
        results: [],
      });
    }

    // express-fileupload returns an object for a single
    // file and an array for multiple files.
    const files = Array.isArray(uploaded)
      ? uploaded
      : [uploaded];

    if (files.length > MAX_FILES) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_FILES} PDFs per request.`,
        results: [],
      });
    }

    const results = [];

    for (const [index, file] of files.entries()) {
      try {
        if (file.size > MAX_FILE_SIZE || file.truncated) {
          throw new Error(
            `PDF exceeds ${PDF_EXTRACTOR_CONFIG.maxFileSizeMB} MB.`
          );
        }

        if (
          file.mimetype !== "application/pdf" ||
          !file.name.toLowerCase().endsWith(".pdf")
        ) {
          throw new Error("Only PDF files are allowed.");
        }

        if (!Buffer.isBuffer(file.data)) {
          throw new Error("PDF data is unavailable.");
        }

        const signature = file.data
          .subarray(0, 5)
          .toString("ascii");

        if (signature !== "%PDF-") {
          throw new Error("Invalid PDF file.");
        }

        console.log("EXTRACTING PDF:", {
          name: file.name,
          size: file.size,
        });

        const extracted = await extractPdfText(file.data);

        let invoiceData = null;
        let extractionWarnings = [];
        let documentType = "UNKNOWN";
        let extractionStatus = "SKIPPED";

        if (extracted.status === "SUCCESS") {
          const structured = extractInvoiceFields(extracted.text);

          invoiceData = structured.invoiceData;
          extractionWarnings = structured.extractionWarnings;
          documentType = structured.documentType;
          extractionStatus = structured.extractionStatus;
        }

        results.push({
          index,
          fileName: file.name,
          fileSize: file.size,
          ...extracted,
          invoiceData,
          extractionWarnings,
          documentType,
          extractionStatus,
        });

        console.log("PDF EXTRACTION COMPLETED:", {
          name: file.name,
          status: extracted.status,
          characters: extracted.characterCount,
        });

      } catch (error) {
        console.error("PDF FILE ERROR:", {
          fileName: file.name,
          error: error.message,
        });

        results.push({
          index,
          fileName: file.name,
          fileSize: file.size,
          text: "",
          pageCount: 0,
          characterCount: 0,
          method: "PDF_TEXT",
          status: "FAILED",
          invoiceData: null,
          extractionWarnings: [],
          documentType: "UNKNOWN",
          extractionStatus: "FAILED",
          error: error.message || "PDF extraction failed.",
        });
      }
    }

    return res.status(200).json({
      success: true,
      totalFiles: results.length,
      results,
    });

  } catch (error) {
    console.error("PDF EXTRACTOR ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unexpected PDF extraction error.",
      results: [],
    });
  }
}

// Verification of extracted invoices and returning the verification results
export async function verifyExtractedInvoices(req, res) {
  try {
    const { invoices, locationId } = req.body || {};

    if (!Array.isArray(invoices) || invoices.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No invoices received for verification.",
        results: [],
      });
    }

    // Temporary development configuration.
    // Production must use authenticated client/company IDs.
    //const clientId = Number(process.env.PDF_EXTRACTOR_TEST_CLIENT_ID);
    //const companyId = Number(process.env.PDF_EXTRACTOR_TEST_COMPANY_ID);

    const companyId = Number(req.user?.companyId);
    const selectedLocationId = Number(locationId);

    if (!Number.isSafeInteger(companyId) || companyId <= 0) {
      return res.status(403).json({
        success: false,
        message: "Authenticated shipping line is not available.",
        results: [],
      });
    }


    const ids = new Set();
    const blNumbers = new Set();

    // Step 1: Validate invoice IDs and collect BL numbers.
    for (const item of invoices) {
      const id = item?.id;

      if (
        id === undefined ||
        id === null ||
        String(id).trim() === "" ||
        ids.has(String(id))
      ) {
        return res.status(400).json({
          success: false,
          message: "Each invoice must have a unique ID.",
          results: [],
        });
      }

      ids.add(String(id));

      const blNo = String(item?.invoiceData?.blNo ?? "")
        .trim()
        .toUpperCase();

      if (blNo) {
        blNumbers.add(blNo);
      }
    }

    // Step 2: Fetch eligible Invoice Requests in ONE SQL query.
    let requestRows = [];

    if (blNumbers.size > 0) {
      const query = `
        SELECT
          ir.id AS invoiceRequestId,
          ir.blNo,
          ir.clientId,
          ir.companyId
        FROM dbo.tblInvoiceRequest ir
        INNER JOIN dbo.tblMasterData m
          ON m.id = ir.invoiceRequestStatusId
        WHERE ir.status = 1
          AND ir.shippingLineId = @companyId
          AND ir.locationId = @locationId
          AND m.name IN ('Requested', 'Released')
          AND UPPER(LTRIM(RTRIM(ir.blNo))) IN (
            SELECT blNo
            FROM OPENJSON(@blNumbers)
            WITH (blNo NVARCHAR(200) '$')
          )
      `;

      console.log("PDF VERIFY INPUT:", {
        shippingLineId: companyId,
        blNumbers: [...blNumbers],
      });



      const data = await executeQuery(query, {
        companyId,
        locationId: selectedLocationId,
        blNumbers: JSON.stringify([...blNumbers]),
      });

      requestRows = Array.isArray(data)
        ? data
        : data?.recordset || [];
    }

    // Step 3: Group matching requests by BL number.
    const requestsByBl = new Map();

    for (const request of requestRows) {
      const blNo = String(request.blNo ?? "")
        .trim()
        .toUpperCase();

      if (!requestsByBl.has(blNo)) {
        requestsByBl.set(blNo, []);
      }

      requestsByBl.get(blNo).push(request);
    }

    // Step 4: Verify every extracted invoice.
    const results = invoices.map((item) => {
      const invoiceData = item.invoiceData || {};

      const invoiceNo = String(invoiceData.invoiceNo ?? "").trim();
      const invoiceDate = String(invoiceData.invoiceDate ?? "").trim();
      const blNo = String(invoiceData.blNo ?? "")
        .trim()
        .toUpperCase();

      const errors = [];

      if (!invoiceNo) {
        errors.push("Please add Invoice Number.");
      }

      if (!invoiceDate) {
        errors.push("Please add Invoice Date.");
      } else {
        const parsedDate = new Date(`${invoiceDate}T00:00:00Z`);

        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) ||
          Number.isNaN(parsedDate.getTime()) ||
          parsedDate.toISOString().slice(0, 10) !== invoiceDate
        ) {
          errors.push("Please enter a valid Invoice Date.");
        }
      }

      const matches = requestsByBl.get(blNo) || [];

      if (!blNo) {
        errors.push("Please add BL Number.");
      } else if (matches.length === 0) {
        errors.push("Please check BL Number. No eligible Invoice Request found.");
      } else if (matches.length > 1) {
        errors.push("Multiple eligible Invoice Requests found for this BL.");
      }

      const verified = errors.length === 0;

      return {
        id: item.id,
        verification: {
          status: verified ? "VERIFIED" : "NOT_VERIFIED",
          message: verified
            ? "Invoice verified successfully."
            : errors.join(" "),
          invoiceRequestId: verified
            ? matches[0].invoiceRequestId
            : null,
        },
      };
    });

    return res.status(200).json({
      success: true,
      totalInvoices: results.length,
      results,
    });
  } catch (error) {
    console.error("PDF VERIFICATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Invoice verification failed.",
      results: [],
    });
  }
}

function getInvoiceSpResult(response) {
  const rows = Array.isArray(response)
    ? response
    : response?.recordset || [];

  if (!rows.length) {
    throw new Error("Stored procedure returned no response.");
  }

  const firstRow = rows[0];

  const raw = Object.hasOwn(firstRow, "success")
    ? firstRow
    : Object.values(firstRow)[0];

  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

  return Array.isArray(parsed) ? parsed[0] : parsed;
}



// Uploading verified invoices and returning the upload results


export async function uploadVerifiedInvoices(req, res) {
  const savedFiles = [];
  let sqlStarted = false;

  try {
    const uploaded = req.files?.files;
    const itemsJson = req.body?.items;

    if (!uploaded || !itemsJson) {
      return res.status(400).json({
        success: false,
        message: "PDF files and invoice data are required.",
      });
    }

    const files = Array.isArray(uploaded) ? uploaded : [uploaded];

    let items;

    try {
      items = typeof itemsJson === "string"
        ? JSON.parse(itemsJson)
        : itemsJson;
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice JSON.",
      });
    }

    if (!Array.isArray(items) || items.length !== files.length ||
        files.length === 0 || files.length > MAX_FILES) {
      return res.status(400).json({
        success: false,
        message: "PDF files and invoice data count do not match.",
      });
    }

    const locationId = Number(items[0]?.userContext?.locationId);
    const allowedLocations = String(req.user?.locations || "")
      .split(",")
      .map(Number);

    const authenticatedUser = {
      companyId: Number(req.user?.companyId),
      companyBranchId: Number(req.user?.branchId),
      locationId,
      createdby: Number(req.user?.userId),
    };

    if (!allowedLocations.includes(locationId) ||
        Object.values(authenticatedUser).some(
          value => !Number.isSafeInteger(value) || value <= 0
        )) {
      return res.status(403).json({
        success: false,
        message: "Invalid or unauthorized user details.",
      });
    }

    const results = [];
    const duplicateKeys = new Set();

    // Validate all files before saving anything.
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const item = items[index];
      const invoice = item?.invoiceData;

      if (!file || !Buffer.isBuffer(file.data) ||
          !file.size || file.size > MAX_FILE_SIZE ||
          file.truncated || file.mimetype !== "application/pdf" ||
          !file.name.toLowerCase().endsWith(".pdf") ||
          file.data.subarray(0, 5).toString("ascii") !== "%PDF-") {
        return res.status(400).json({
          success: false,
          message: `Invalid PDF at position ${index + 1}.`,
        });
      }

      if (item?.index !== index || item?.fileName !== file.name ||
          !invoice?.invoiceNo || !invoice?.blNo || !invoice?.invoiceDate) {
        return res.status(400).json({
          success: false,
          message: `Invalid invoice metadata at position ${index + 1}.`,
        });
      }

      if (Number(item?.userContext?.locationId) !== locationId) {
        return res.status(403).json({
          success: false,
          message: "Invoice location mismatch.",
        });
      }

      const key = `${String(invoice.invoiceNo).trim().toUpperCase()}|${String(invoice.blNo).trim().toUpperCase()}`;

      if (duplicateKeys.has(key)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate invoice in upload: ${invoice.invoiceNo}`,
        });
      }

      duplicateKeys.add(key);
    }

    // Confirm invoice request eligibility and duplicates in SQL.
    // The stored procedure must also enforce duplicate prevention.
    for (const item of items) {
      const invoice = item.invoiceData;

      const checkRows = await executeQuery(`
        SELECT ir.id AS invoiceRequestId
        FROM dbo.tblInvoiceRequest ir
        INNER JOIN dbo.tblMasterData m ON m.id = ir.invoiceRequestStatusId
        WHERE ir.blNo = @blNo
          AND ir.status = 1
          AND ir.shippingLineId = @companyId
          AND ir.locationId = @locationId
          AND m.name IN ('Requested','Released')
      `, {
        blNo: invoice.blNo,
        companyId: authenticatedUser.companyId,
        locationId,
      });

      const matches = Array.isArray(checkRows)
        ? checkRows
        : checkRows?.recordset || [];

      if (matches.length !== 1 ||
          Number(matches[0].invoiceRequestId) !== Number(item.invoiceRequestId)) {
        return res.status(400).json({
          success: false,
          message: `Invoice Request verification failed for BL ${invoice.blNo}.`,
        });
      }

      const duplicates = await executeQuery(`
        SELECT TOP 1 id
        FROM dbo.tblInvoice
        WHERE invoiceNo = @invoiceNo
          AND invoiceRequestId = @invoiceRequestId
          AND companyId = @companyId
          AND status = 1
      `, {
        invoiceNo: invoice.invoiceNo,
        invoiceRequestId: matches[0].invoiceRequestId,
        companyId: authenticatedUser.companyId,
      });

      const existing = Array.isArray(duplicates)
        ? duplicates
        : duplicates?.recordset || [];

      if (existing.length) {
        return res.status(409).json({
          success: false,
          message: `Invoice already uploaded: ${invoice.invoiceNo}`,
        });
      }
    }

    // Save PDFs and use exactly the same names in SQL.
    for (let index = 0; index < files.length; index++) {
      const savedPdf = await saveInvoicePdf(files[index]);
      savedFiles.push(savedPdf.storagePath);

      results.push({
        fileName: savedPdf.storedFileName,
        invoiceData: {
          ...items[index].invoiceData,
          ...authenticatedUser,
        },
      });
    }

    const invoicePayload = {
      success: true,
      totalFiles: results.length,
      results,
    };

    sqlStarted = true;

    const spResponse = await executeQuery(
      "EXEC dbo.insertSubmitInvoice @json = @json",
      { json: JSON.stringify(invoicePayload) }
    );

    const spResult = getInvoiceSpResult(spResponse);

    if (spResult?.success !== true && spResult?.success !== 1) {
      let errors = spResult?.message;

      if (typeof errors === "string") {
        try {
          errors = JSON.parse(errors);
        } catch {
          errors = [{ message: errors }];
        }
      }

      await Promise.allSettled(savedFiles.map(file => fs.unlink(file)));

      return res.status(400).json({
        success: false,
        message: "Invoice upload rejected by SQL Server.",
        errors,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invoices and PDFs uploaded successfully.",
      totalFiles: results.length,
      results,
    });

  } catch (error) {
    console.error("PDF INVOICE UPLOAD ERROR:", error);

    // If SQL was never called, no database insert could have happened.
    if (!sqlStarted) {
      await Promise.allSettled(savedFiles.map(file => fs.unlink(file)));
    }

    return res.status(500).json({
      success: false,
      message: sqlStarted
        ? "Invoice upload result could not be confirmed. Check database records before retrying."
        : "Unable to save invoice PDFs.",
    });
  }
}
