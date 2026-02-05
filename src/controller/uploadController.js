// controllers/uploadToSp.js
import {
  executeQuerySpData,
  executeQuery,
} from "../config/DBConfig.js";

// Allow proc / dbo.proc / db.dbo.proc (letters, digits, underscores)
const VALID_SP =
  /^(?:[A-Za-z_][A-Za-z0-9_]*)(?:\.[A-Za-z_][A-Za-z0-9_]*){0,2}$/;

// Bracket-qualify each identifier part to avoid injection via names
const qualify = (name) =>
  name
    .split(".")
    .map((p) => `[${p}]`)
    .join(".");

// Try to parse FOR JSON PATH outputs
const parseJsonish = (result) => {
  const tryParse = (v) => {
    if (typeof v !== "string") return null;
    const s = v.trim();
    if (!s || (s[0] !== "{" && s[0] !== "[")) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  if (!result) return [];

  // mssql common shapes
  const rs =
    result.recordset ||
    (Array.isArray(result.recordsets) && result.recordsets[0]) ||
    (Array.isArray(result) ? result : null);

  if (Array.isArray(rs)) {
    if (rs.length === 1 && rs[0] && typeof rs[0] === "object") {
      // Look for a JSON-looking column
      for (const v of Object.values(rs[0])) {
        const parsed = tryParse(v);
        if (parsed != null) return parsed;
      }
    }
    return rs; // plain rows
  }

  // Fallback attempts
  if (typeof result === "string") {
    const parsed = tryParse(result);
    if (parsed != null) return parsed;
  }
  if (typeof result === "object") {
    for (const v of Object.values(result)) {
      const parsed = tryParse(v);
      if (parsed != null) return parsed;
    }
  }
  return [];
};

export const uploadToSp = async (req, res) => {
  try {
    const { spName, json } = req.body || {};
    console.log(spName);
    // Basic validation
    if (!spName || typeof spName !== "string" || !VALID_SP.test(spName)) {
      return res.status(400).send({
        success: false,
        message: "Invalid or missing 'spName'",
        data: [],
      });
    }
    if (typeof json === "undefined") {
      return res.status(400).send({
        success: false,
        message: "Missing 'json' in request body",
        data: [],
      });
    }


    const sql = `EXEC ${qualify(spName.trim())} @json=@json`;
    const params = { json: JSON.stringify(json) }; // ← pass the whole object

    const result = await executeQuerySpData(sql, params);
    const data = parseJsonish(result);

    // If your proc returns a JSON object with {success, message, data}, pass it through
    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      "success" in data
    ) {
      return res.send(data);
    }

    const arr = Array.isArray(data) ? data : [];
    const r0 = arr[0];

    const hasSpStatus =
      r0 && typeof r0 === "object" && "success" in r0 && "message" in r0;

    return res.send({
      success: hasSpStatus ? Number(r0.success) === 1 : true,
      message: hasSpStatus
        ? String(r0.message)
        : (arr.length ? "Data Inserted successfully" : "No data returned"),
      data: arr,
    });

  } catch (err) {
    console.error("uploadToSp error:", err);
    return res.status(500).send({
      success: false,
      message: err?.message || "Internal Server Error",
      data: [],
    });
  }
};

// upload invoiceUpload api
export const invoiceUploadPDF = async (req, res) => {
  try {
    const { spName, json } = req.body;

    if (!spName || !json) {
      return res
        .status(400)
        .send({ message: "SpName and Json data are required" });
    }

    // query
    const query = `EXEC insertInvoiceDataFromPdf @json=@json`;

    const params = { spName: spName, json: json };

    const result = await executeQuery(query, params);

    console.log(result);

    return res.send({
      success: true,
      message: "Data Inserted successfully",
      data: [], // for now
    });
  } catch (err) {
    console.error("uploadToSp error:", err);
    return res.status(500).send({
      success: false,
      message: err?.message || "Internal Server Error",
      data: [],
    });
  }
};
