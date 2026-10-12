
const positiveInteger = (value, fallback) => {
  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0
    ? number
    : fallback;
};

export const PDF_EXTRACTOR_CONFIG = {
  maxFilesPerRequest: positiveInteger(
    process.env.PDF_MAX_FILES_PER_REQUEST,
    5
  ),

  maxFileSizeMB: positiveInteger(
    process.env.PDF_MAX_FILE_SIZE_MB,
    10
  ),

  fields: {
    invoiceNo: true,
    blNo: true,
    invoiceTypeId: true,
    totalInvoiceAmount: true,
    invoiceDate: true,
    invoiceCategoryId: true,
    billingParty: true,
    billingPartyGstinNo: true,
    remarks: true,
  },
};

export const MAX_PDF_FILE_SIZE =
  PDF_EXTRACTOR_CONFIG.maxFileSizeMB * 1024 * 1024;
