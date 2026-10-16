
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use existing MMD3Node/uploads folder
const STORAGE_DIR = path.resolve(
  __dirname,
  "../../../uploads/invoice-pdfs"
);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function saveInvoicePdf(file) {
  if (!file || !Buffer.isBuffer(file.data)) {
    throw new Error("PDF file data is missing.");
  }

  if (!file.size || file.size > MAX_FILE_SIZE || file.truncated) {
    throw new Error("PDF exceeds the allowed file size.");
  }

  if (
    file.mimetype !== "application/pdf" ||
    !file.name.toLowerCase().endsWith(".pdf") ||
    file.data.subarray(0, 5).toString("ascii") !== "%PDF-"
  ) {
    throw new Error("Invalid PDF file.");
  }

  const fileId = crypto.randomUUID();

  const originalName = path
    .basename(file.name)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");

  const storedFileName = `${Date.now()}-${originalName}`;
  const fullPath = path.join(STORAGE_DIR, storedFileName);

  await fs.mkdir(STORAGE_DIR, { recursive: true });

  // Save exact original PDF without overwriting existing files.
  await fs.writeFile(fullPath, file.data, { flag: "wx" });

  return {
    fileId,
    originalFileName: file.name,
    storedFileName,
    storagePath: fullPath,
    relativePath: `invoice-pdfs/${storedFileName}`,
    fileSize: file.size,
    sha256: crypto
      .createHash("sha256")
      .update(file.data)
      .digest("hex"),
  };
}
