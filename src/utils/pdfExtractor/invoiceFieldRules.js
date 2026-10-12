
import { PDF_EXTRACTOR_CONFIG } from "../../config/pdfExtractor.config.js";

// ========================================================
// COMMON HELPERS
// ========================================================

// Original PDF text remains unchanged.
// Only a separate working copy is normalized.

const clean = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const prepareText = (text) => {
  const original = String(text ?? "");

  return {
    original,
    normalized: clean(original),
    lines: original
      .split(/\r?\n/)
      .map(clean),
  };
};

const GSTIN_PATTERN =
  /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/i;

const AMOUNT_PATTERN =
  String.raw`(?:-\s*)?(?:₹\s*)?\d[\d,]*(?:\.\d{1,2})?|\(\s*(?:₹\s*)?\d[\d,]*(?:\.\d{1,2})?\s*\)`;

const parseAmount = (value) => {
  if (value == null || !String(value).trim()) {
    return null;
  }

  let raw = clean(value).replace(/[₹,\s]/g, "");

  if (/^\(.*\)$/.test(raw)) {
    raw = `-${raw.slice(1, -1)}`;
  }

  const amount = Number(raw);

  return Number.isFinite(amount) ? amount : null;
};

// Locate a value after a label.
// Supports same-line and next-line extraction.

const matchField = (
  lines,
  label,
  valuePattern,
  validate = () => true
) => {
  const sameLine = new RegExp(
    String.raw`\b(?:${label})\s*[:#.]?\s*(${valuePattern})`,
    "i"
  );

  const labelOnly = new RegExp(
    String.raw`^(?:${label})\s*[:#.]?\s*$`,
    "i"
  );

  const nextLineValue = new RegExp(
    String.raw`^\s*(${valuePattern})(?=\s|$)`,
    "i"
  );

  for (let i = 0; i < lines.length; i++) {
    const matched = lines[i].match(sameLine);

    if (
      matched?.[1] &&
      validate(clean(matched[1]))
    ) {
      return clean(matched[1]);
    }

    if (labelOnly.test(lines[i])) {
      const next = lines[i + 1]?.match(nextLineValue);

      if (
        next?.[1] &&
        validate(clean(next[1]))
      ) {
        return clean(next[1]);
      }
    }
  }

  return null;
};

// ========================================================
// 1. INVOICE NUMBER
// ========================================================

const REFERENCE_PATTERN =
  String.raw`[A-Z0-9][A-Z0-9/_.-]*`;

const validReference = (value) =>
  Boolean(
    value &&
      /\d/.test(value) &&
      value.length >= 4 &&
      !/^(?:EXCH|RATE|VALUE|AMOUNT|CONTAINER|DATE|NUMBER|NO)$/i.test(
        value
      )
  );

const extractInvoiceNo = ({ lines }) => {
  return matchField(
    lines,
    String.raw`(?:INVOICE\s*(?:NO\.?|NUMBER)|INV\.?\s*NO\.?|BILL\s*OF\s*SUPPLY\s*(?:NO\.?|NUMBER)|CREDIT\s*NOTE\s*(?:NO\.?|NUMBER))`,
    REFERENCE_PATTERN,
    validReference
  );
};

// ========================================================
// 2. BL NUMBER
// ========================================================

const extractBlNo = ({ lines }) => {
  const labels = [
    String.raw`HBL\s*(?:NO\.?|NUMBER)`,
    String.raw`B\s*\/\s*L\s*(?:NO\.?|NUMBER)`,
    String.raw`BL\s*(?:NO\.?|NUMBER)`,
    String.raw`MASTER\s*BL\s*(?:NO\.?)?`,
  ];

  for (const label of labels) {
    const result = matchField(
      lines,
      label,
      REFERENCE_PATTERN,
      validReference
    );

    if (result) {
      return result;
    }
  }

  // ONE invoices sometimes place BL No in a charge table:
  // POR | DEL | BL No | Exchange Rate

  const hasBlHeader = lines.some((line) =>
    /\bBL\s+NO\b|\bB\s*\/\s*L\s+NO\b/i.test(line)
  );

  if (!hasBlHeader) {
    return null;
  }

  for (const line of lines) {
    if (!/\b[A-Z]{4}\d{7}\b/i.test(line)) {
      continue;
    }

    const values = line.split(/\s+/);

    for (let i = 0; i < values.length - 2; i++) {
      const fromPort = values[i];
      const toPort = values[i + 1];
      const candidate = values[i + 2];

      if (
        /^[A-Z]{5}$/.test(fromPort) &&
        /^[A-Z]{5}$/.test(toPort) &&
        validReference(candidate) &&
        /^[A-Z0-9/.-]{6,}$/i.test(candidate)
      ) {
        return candidate;
      }
    }
  }

  return null;
};

// ========================================================
// 3. INVOICE TYPE
// ========================================================

const extractInvoiceType = ({ normalized }) => {
  const header = normalized.slice(0, 1800);

  if (/\bCREDIT\s*NOTE\b/i.test(header)) {
    return "Credit Note";
  }

  if (/\bPROFORMA\s+INVOICE\b/i.test(header)) {
    return "Proforma";
  }

  if (/\bTAX\s+INVOICE\b/i.test(header)) {
    return "TAX INVOICE";
  }

  if (/\bBILL\s+OF\s+SUPPLY\b/i.test(header)) {
    return "BILL OF SUPPLY";
  }

  return null;
};

// ========================================================
// 4. TOTAL INVOICE AMOUNT
// ========================================================

const extractTotalInvoiceAmount = ({ lines }) => {
  // Ocean Network Express:
  // Total Invoice Value (in figure) -493,882.06

  const explicitTotal = new RegExp(
    String.raw`^\s*(?:TOTAL\s+INVOICE\s+VALUE\s*(?:\(\s*IN\s+FIGURE\s*\))?|GRAND\s+TOTAL|NET\s+PAYABLE|TOTAL\s+AMOUNT)\s*:?\s*(${AMOUNT_PATTERN})(?=\s|$)`,
    "i"
  );

  for (const line of lines) {
    const matched = line.match(explicitTotal);

    if (matched) {
      return parseAmount(matched[1]);
    }
  }

  // Master Logitech:
  // Total 18,000.00 3,240.00 21,240.00
  //
  // The final numeric column is the amount with tax.

  for (const line of lines) {
    const matched = line.match(/^TOTAL\s+(.+)$/i);

    if (!matched) {
      continue;
    }

    if (/[A-Za-z]/.test(matched[1])) {
      continue;
    }

    const amounts =
      matched[1].match(new RegExp(AMOUNT_PATTERN, "g")) || [];

    if (
      amounts.length >= 2 &&
      amounts.length <= 5
    ) {
      return parseAmount(
        amounts[amounts.length - 1]
      );
    }
  }

  return null;
};

// ========================================================
// 5. INVOICE DATE
// ========================================================

const MONTHS = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const source = clean(value);

  let year;
  let month;
  let day;

  let matched = source.match(
    /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/
  );

  if (matched) {
    [, year, month, day] = matched;
  } else {
    matched = source.match(
      /^(\d{1,2})[-/.\s]?([A-Za-z]{3})[-/.\s]?(\d{2,4})$/i
    );

    if (matched) {
      day = matched[1];
      month = MONTHS[matched[2].toUpperCase()];
      year = matched[3];
    } else {
      matched = source.match(
        /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/
      );

      if (!matched) {
        return null;
      }

      [, day, month, year] = matched;
    }
  }

  if (!month) {
    return null;
  }

  if (String(year).length === 2) {
    year =
      Number(year) >= 70
        ? 1900 + Number(year)
        : 2000 + Number(year);
  }

  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  const date = new Date(
    Date.UTC(y, m - 1, d)
  );

  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() + 1 !== m ||
    date.getUTCDate() !== d
  ) {
    return null;
  }

  return [
    String(y).padStart(4, "0"),
    String(m).padStart(2, "0"),
    String(d).padStart(2, "0"),
  ].join("-");
};

const DATE_PATTERN =
  String.raw`(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.\s]?[A-Za-z]{3}[-/.\s]?\d{2,4}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})`;

const extractInvoiceDate = ({ lines }) => {
  const date = matchField(
    lines,
    String.raw`(?:INVOICE\s*DATE|INV\.?\s*DATE|ISSUE\s*DATE|DATE\s*OF\s*ISSUE)`,
    DATE_PATTERN
  );

  return parseDate(date);
};

// ========================================================
// 6. INVOICE CATEGORY
// ========================================================

const extractInvoiceCategory = ({
  normalized,
  lines,
}) => {
  const header = normalized.slice(0, 1800);

  if (
    /\bDETENTION\b/i.test(header) ||
    lines.some((line) =>
      /^DETENTION\s+CHARGES?\b/i.test(line)
    )
  ) {
    return "DETENTION";
  }

  if (
    lines.some((line) =>
      /\b(?:BASIC\s+OCEAN\s+FREIGHT|OCEAN\s+FREIGHT|FREIGHT\s+CHARGES?)\b/i.test(
        line
      )
    )
  ) {
    return "FREIGHT";
  }

  // Retains the previous category default.
  return "LOCAL CHARGES";
};

// ========================================================
// 7. BILLING PARTY
// ========================================================

const BILLING_HEADING =
  /\b(?:BILLED\s+TO|BILL\s+TO|CUSTOMER\s+NAME(?:\s*,?\s*ADDRESS\s*&\s*POS)?|BUYER\s+NAME)\b/i;

const METADATA_PATTERN =
  /^(?:SEZ\b|SAILING\b|ARRIVAL\b|DATE\b|\d|B\s*\/\s*L\b|BL\b|BKG\b|BOOKING\b|REFERENCE\b|GST\b|CUSTOMER\b|PLACE\b|PORT\b|VESSEL\b|INVOICE\b|ORIGINAL\b|CODE\b|ADDRESS\b|POS\b|RCV\b|DUE\b|IRN\b)/i;

const STOP_PATTERN =
  /^(?:PAYMENT\s+TO|FOR\s+PAYMENT|BANK\s+DETAILS|DECLARATION|AUTHORI[ZS]ED\s+SIGNATORY|SEQ\s+CHG|CHARGE\s+DESCRIPTION|TOTAL\s+INVOICE|PAN\b|TAX\s+INVOICE\b|PROFORMA\s+INVOICE\b|BILL\s+OF\s+SUPPLY\b)/i;

const cleanBillingParty = (value) => {
  let name = clean(value);

  // Preserve:
  // BAXTER (INDIA) PRIVATE LIMITED
  //
  // Remove address in parentheses:
  // BABY BLOOM(Jamba Colony, Bhutan)

  name = name.replace(
    /\s*\((?!\s*(?:INDIA|INDIAN)\s*\))[^)]*(?:\b(?:ROAD|FLOOR|STREET|COLONY|VILLAGE|NAGAR|CENTRE|CENTER|PLOT|SHOP|KOLKATA|MUMBAI|DELHI|BHUTAN|NEPAL|CHENNAI)\b|\d)[^)]*\).*$/i,
    ""
  );

  // Incomplete parenthetical address.

  name = name.replace(
    /\s*\((?!\s*(?:INDIA|INDIAN)\s*\))[^)]*$/i,
    ""
  );

  // Remove adjacent field labels.

  name = name.split(
    /\s+(?=\b(?:BKG\s+REF|BOOKING\s+NO|SAILING|ARRIVAL|DUE\s+DATE|GSTIN|PAN)\b)/i
  )[0];

  // Remove unbracketed addresses.

  name = name.split(
    /\s+(?=\b(?:GAT|PLOT|FLAT|ROOM|SHOP|OFFICE|BUILDING|FLOOR|ROAD|STREET|VILLAGE|COLONY)\b|\d{1,6}\s+)/i
  )[0];

  return clean(
    name.replace(/[|,\-]+$/, "")
  ) || null;
};

const validBillingParty = (value) => {
  if (!value || value.length < 3) {
    return false;
  }

  if (!/[A-Za-z]{3}/.test(value)) {
    return false;
  }

  if (
    METADATA_PATTERN.test(value) ||
    STOP_PATTERN.test(value)
  ) {
    return false;
  }

  if (
    /\b(?:PAYMENT|CONTAINER|RATE|AMOUNT|TAXABLE|REFERENCE|GST|PAN)\b/i.test(
      value
    )
  ) {
    return false;
  }

  return true;
};

const extractBillingParty = ({ lines }) => {
  const text = lines.join("\n");

  const heading = BILLING_HEADING.exec(text);

  if (!heading) {
    return null;
  }

  const followingLines = text
    .slice(heading.index + heading[0].length)
    .split("\n")
    .slice(0, 18);

  for (const entry of followingLines) {
    const line = clean(entry);

    if (!line || METADATA_PATTERN.test(line)) {
      continue;
    }

    if (STOP_PATTERN.test(line)) {
      break;
    }

    const billingParty = cleanBillingParty(line);

    if (validBillingParty(billingParty)) {
      return billingParty;
    }
  }

  return null;
};

// ========================================================
// 8. BILLING PARTY GSTIN
// ========================================================

const extractBillingPartyGstinNo = ({
  normalized,
  lines,
}) => {
  // Ocean Network Express:
  // Customer GST 27XXXXXXXXXX...

  const customer = normalized.match(
    /\b(?:CUSTOMER|BUYER|BILL\s*TO|BILLED\s*TO)\s+GST(?:IN|\s*NO\.?)?\s*[:#]?\s*([A-Z0-9]{15})\b/i
  );

  if (
    customer &&
    GSTIN_PATTERN.test(customer[1])
  ) {
    return customer[1].toUpperCase();
  }

  // Customer and GST may be on separate lines.

  for (let i = 0; i < lines.length - 1; i++) {
    if (/^CUSTOMER$/i.test(lines[i])) {
      const next = lines[i + 1].match(
        /^GST(?:IN|\s*NO\.?)?\s*[:#]?\s*([A-Z0-9]{15})\b/i
      );

      if (
        next &&
        GSTIN_PATTERN.test(next[1])
      ) {
        return next[1].toUpperCase();
      }
    }
  }

  // Master Logitech:
  // BILLED TO
  // Customer name
  // ...
  // GST No. : 07XXXXXXXXXX...
  //
  // GST must come from the billing section.

  const billingIndex = lines.findIndex((line) =>
    /^BILLED\s+TO\b|^BILL\s+TO\b/i.test(line)
  );

  if (billingIndex >= 0) {
    const section = lines.slice(
      billingIndex + 1,
      billingIndex + 24
    );

    for (const line of section) {
      if (
        /^(?:PARTICULARS|BANK\s+DETAILS|AMOUNT\s+IN\s+WORDS)\b/i.test(
          line
        )
      ) {
        break;
      }

      const matched = line.match(
        /\bGST\s*(?:IN|NO\.?)\s*[:#.]?\s*([A-Z0-9]{15})\b/i
      );

      if (
        matched &&
        GSTIN_PATTERN.test(matched[1])
      ) {
        return matched[1].toUpperCase();
      }
    }
  }

  // Do not use supplier GSTIN as a fallback.
  return null;
};

// ========================================================
// 9. REMARKS
// ========================================================

const extractRemarks = ({ original }) => {
  const match = original.match(
    /\bREMARKS?\s*[:#]?([^\r\n]*)(?:\r?\n|$)/i
  );

  if (!match) {
    return null;
  }

  const forbidden =
    /^(?:DECLARATION|BANK\s+DETAILS|PAYMENT|FOR\s+PAYMENT|AUTHORI[ZS]ED|ACCOUNT|TERMS\s+AND\s+CONDITIONS|NOTE\s*:)/i;

  const sameLine = clean(match[1]);

  if (
    sameLine &&
    !forbidden.test(sameLine)
  ) {
    return sameLine;
  }

  if (sameLine) {
    return null;
  }

  const nextLine = original
    .slice(match.index + match[0].length)
    .split(/\r?\n/)
    .map(clean)
    .find(Boolean);

  return nextLine && !forbidden.test(nextLine)
    ? nextLine
    : null;
};

// ========================================================
// DOCUMENT TYPE DETECTION
// ========================================================

const identifyDocument = ({ normalized }) => {
  const header = normalized.slice(0, 1700);

  // Some delivery orders mention invoice numbers.
  // They must not be treated as invoices.

  const isDeliveryOrder =
    /\b(?:SEA\s+DELIVERY\s+ORDER|DELIVERY\s+ORDER\s+ISSUED|DELIVERY\s+ORDER\s+NO)\b/i.test(
      header
    );

  const isInvoice =
    /\b(?:TAX|PROFORMA)\s+INVOICE\b|\bBILL\s+OF\s+SUPPLY\b|\bCREDIT\s+NOTE\b/i.test(
      header
    );

  if (isDeliveryOrder && !isInvoice) {
    return "DELIVERY_ORDER";
  }

  if (isInvoice) {
    return "INVOICE";
  }

  return "UNKNOWN";
};

// ========================================================
// FIELD REGISTRY
// ========================================================

export const invoiceFieldRules = {
  invoiceNo: extractInvoiceNo,
  blNo: extractBlNo,
  invoiceTypeId: extractInvoiceType,
  totalInvoiceAmount: extractTotalInvoiceAmount,
  invoiceDate: extractInvoiceDate,
  invoiceCategoryId: extractInvoiceCategory,
  billingParty: extractBillingParty,
  billingPartyGstinNo: extractBillingPartyGstinNo,
  remarks: extractRemarks,
};

// ========================================================
// MAIN EXTRACTION FUNCTION
// ========================================================

export function extractInvoiceFields(text = "") {
  const context = prepareText(text);

  const documentType = identifyDocument(context);

  const invoiceData = {};
  const extractionWarnings = [];

  // Skip delivery orders and unsupported document types.

  if (documentType !== "INVOICE") {
    for (const [field, enabled] of Object.entries(
      PDF_EXTRACTOR_CONFIG.fields
    )) {
      if (enabled) {
        invoiceData[field] = null;
      }
    }

    extractionWarnings.push(
      documentType === "DELIVERY_ORDER"
        ? "Document is a delivery order, not an invoice."
        : "Invoice document type could not be confirmed."
    );

    return {
      invoiceData,
      extractionWarnings,
      documentType,
      extractionStatus: "SKIPPED",
    };
  }

  const requiredFields = new Set([
    "invoiceNo",
    "blNo",
    "invoiceTypeId",
    "totalInvoiceAmount",
    "invoiceDate",
    "billingParty",
  ]);

  for (const [field, enabled] of Object.entries(
    PDF_EXTRACTOR_CONFIG.fields
  )) {
    if (!enabled) {
      continue;
    }

    try {
      const extractor = invoiceFieldRules[field];

      const value =
        typeof extractor === "function"
          ? extractor(context)
          : null;

      invoiceData[field] = value ?? null;

      if (!extractor) {
        extractionWarnings.push(
          `No extraction rule configured for ${field}`
        );
      } else if (
        (value === null || value === "") &&
        requiredFields.has(field)
      ) {
        extractionWarnings.push(
          `Field not found: ${field}`
        );
      }
    } catch (error) {
      invoiceData[field] = null;

      extractionWarnings.push(
        `Error extracting ${field}: ${error.message}`
      );
    }
  }

  return {
    invoiceData,
    extractionWarnings,
    documentType,
    extractionStatus:
      extractionWarnings.length > 0
        ? "REVIEW_REQUIRED"
        : "COMPLETE",
  };
}
