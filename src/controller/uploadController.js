// controllers/uploadToSp.js
import {
  initializeConnection,
  executeQuerySpData,
} from "../config/DBConfig.js";
// --- utils ---------------------------------------------------------------

// Allow proc, dbo.proc, db.dbo.proc
// =================== helpers ===================

// proc / dbo.proc / db.dbo.proc
const VALID_SP =
  /^(?:[A-Za-z_][A-Za-z0-9_]*)(?:\.[A-Za-z_][A-Za-z0-9_]*){0,2}$/;

const safeParse = (v) => {
  if (v == null) return {};
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }
  return v;
};

const toNonNegInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

// Bracket-qualify parts to avoid SQL injection via identifiers
const qualifySpName = (name) =>
  name
    .split(".")
    .map((part) => `[${part}]`)
    .join(".");

// Remove these quote-like chars from strings and key names
const QUOTE_RE = /['\u2019\u2018\u02BC\uFF07\u2032\u2035\u0060]/g; // ' ’ ‘ ʼ ＇ ′ ‵ `

// Deep sanitize:
// 1) remove quote-like chars from all string values
// 2) drop keys starting with "__EMPTY"
// 3) strip quote-like chars from key names (e.g., Forwarder’s PAN -> Forwarders PAN)
const sanitizeDeep = (val) => {
  const isEmptyKey = (k) => /^__EMPTY/i.test(k);

  if (val == null) return val;

  if (typeof val === "string") {
    return val.replace(QUOTE_RE, "");
  }

  if (Array.isArray(val)) {
    return val.map(sanitizeDeep);
  }

  if (typeof val === "object") {
    const out = {};
    for (const [rawKey, rawVal] of Object.entries(val)) {
      if (isEmptyKey(rawKey)) continue;

      const newKey = rawKey.replace(QUOTE_RE, "");
      const newVal = sanitizeDeep(rawVal);

      if (Object.prototype.hasOwnProperty.call(out, newKey)) {
        const cur = out[newKey];
        const curEmpty =
          cur == null ||
          (typeof cur === "string" && cur.trim() === "") ||
          (Array.isArray(cur) && cur.length === 0);
        if (curEmpty) out[newKey] = newVal;
      } else {
        out[newKey] = newVal;
      }
    }
    return out;
  }

  return val;
};

const dropTop = (arr, n) =>
  Array.isArray(arr) ? arr.slice(Math.min(n, arr.length)) : arr;

// Parse SQL Server EXEC results into usable JSON/arrays.
// Works with outputs produced via "FOR JSON PATH" or plain recordsets.
const parseForJsonPath = (result) => {
  if (!result) return [];

  const tryParse = (v) => {
    if (v == null) return null;
    if (typeof v !== "string") return null;
    const s = v.trim();
    if (!s || (s[0] !== "{" && s[0] !== "[")) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  const recordset =
    result.recordset ||
    (Array.isArray(result.recordsets) && result.recordsets[0]) ||
    (Array.isArray(result) ? result : null);

  if (Array.isArray(recordset)) {
    if (
      recordset.length === 1 &&
      recordset[0] &&
      typeof recordset[0] === "object"
    ) {
      const row = recordset[0];
      for (const key of Object.keys(row)) {
        if (/^json$/i.test(key) || /json/i.test(key)) {
          const parsed = tryParse(row[key]);
          if (parsed != null) return parsed;
        }
      }
      for (const val of Object.values(row)) {
        const parsed = tryParse(val);
        if (parsed != null) return parsed;
      }
    }
    return recordset;
  }

  if (typeof result === "string") {
    const parsed = tryParse(result);
    if (parsed != null) return parsed;
  }

  if (typeof result === "object") {
    for (const val of Object.values(result)) {
      const parsed = tryParse(val);
      if (parsed != null) return parsed;
    }
  }

  return [];
};

// =================== MAIN HANDLER ===================

export const uploadToSp = async (req, res) => {
  try {
    const { spName, json } = req.body || {};

    // Validate spName
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

    await initializeConnection();

    const sp = spName.trim();
    const obj = safeParse(json);

    // Extract & sanitize
    const rawHeader = obj.header || obj.criteria || {};
    const rawData = Array.isArray(obj.data) ? obj.data : [];

    const header = sanitizeDeep(rawHeader);
    const dataSanitized = sanitizeDeep(rawData);

    // Optionally remove top N rows
    const N = toNonNegInt(obj.objectToRemove ?? header.objectToRemove);
    const data = dropTop(dataSanitized, N);

    // Special case: inputMbl
    if (sp.toLowerCase() === "inputmbl") {
      const wrapped = {
        criteria: {
          fpdId: header.fpdId ?? null,
          podvesselId: header.podvesselId ?? null,
          submitterTypeId: header.submitterTypeId ?? null,
          consigneeIdNo: header.consigneeIdNo ?? null,
        },
        data,
      };

      const params = {
        json: JSON.stringify(wrapped),
        createdBy: header.userId ?? header.createdBy ?? 0,
        clientId: header.clientId ?? 17,
        companyId: header.companyId ?? 0,
        companyBranchId: header.companyBranchId ?? 0,
      };

      // 🔧 FIXED: include all params in EXEC (you previously only passed @json)
      const query = `EXEC ${qualifySpName(sp)} ` + `@json=@json`;

      const result = await executeQuerySpData(query, params);
      const payload = parseForJsonPath(result);

      if (
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        "success" in payload
      ) {
        return res.send(payload);
      }
      return res.send({
        success: true,
        message: "Executed inputMbl",
        data: Array.isArray(payload) ? payload : [],
      });
    }

    // Default: SPs taking only @json
    const defaultJson = {
      template:
        typeof obj.template === "string"
          ? obj.template.replace(QUOTE_RE, "")
          : obj.template,
      header,
      data,
    };

    const query = `EXEC ${qualifySpName(sp)} @json=@json`;
    const result = await executeQuerySpData(query, {
      json: JSON.stringify(defaultJson),
    });
    const dataOut = parseForJsonPath(result);

    return res.send({
      success: true,
      message:
        Array.isArray(dataOut) && dataOut.length
          ? "Data fetched successfully"
          : "No data returned",
      data: Array.isArray(dataOut) ? dataOut : [],
    });
  } catch (error) {
    console.error("❌ uploadToSp error:", error);
    return res.status(500).send({
      success: false,
      message: error?.message || "Internal Server Error",
      data: [],
    });
  }
};
