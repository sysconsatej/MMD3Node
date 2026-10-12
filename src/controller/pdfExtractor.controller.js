
import { PDFParse } from "pdf-parse";

import {
  PDF_EXTRACTOR_CONFIG,
  MAX_PDF_FILE_SIZE,
} from "../config/pdfExtractor.config.js";

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

    const text = result.text || "";
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

        if (extracted.status === "SUCCESS") {
          const structured = extractInvoiceFields(extracted.text);

          invoiceData = structured.invoiceData;
          extractionWarnings = structured.extractionWarnings;
        }

        results.push({
          index,
          fileName: file.name,
          fileSize: file.size,
          ...extracted,
          invoiceData,
          extractionWarnings,
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
