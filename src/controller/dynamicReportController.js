import { initializeConnection, closeConnection, executeQuerySpData, } from "../config/DBConfig.js";

export const dynamicReportUpdate = async (req, res) => {
  const spName = req.body?.spName || req.body?.spname;
  let { jsonData } = req.body;

  if (!spName || typeof spName !== "string" || !/^[A-Za-z0-9_.]+$/.test(spName)) {
    return res.status(400).json({
      success: false,
      message: "Invalid or missing 'spName'. Only letters, numbers, underscore, and dot are allowed.",
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
      message: "No jsonData supplied. Provide 'jsonData' as an object or array of objects.",
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

        const recordset =
          Array.isArray(raw) ? raw : raw?.recordset || (Array.isArray(raw?.recordsets) && raw.recordsets[0]) || [];
        const firstRow = recordset?.[0];
        const firstColName = firstRow ? Object.keys(firstRow)[0] : null;
        const maybeJsonStr = firstRow
          ? (firstRow.json ?? firstRow.data ?? (typeof firstRow[firstColName] === "string" ? firstRow[firstColName] : null))
          : null;

        let data = null;
        if (typeof maybeJsonStr === "string") {
          const t = maybeJsonStr.trim();
          if (t && /^[\[{]/.test(t)) {
            try { data = JSON.parse(t); } catch { /* ignore parse error; keep data = null */ }
          }
        }

        results.push({
          index: i,
          ok: true,
          data: data ?? recordset ?? null,
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
  const result = await executeQuerySpData(sqlText, { jsonData: payload });
  const recordset = Array.isArray(result)
    ? result
    : result?.recordset ||
      (Array.isArray(result?.recordsets) && result.recordsets[0]) ||
      [];

  if (!recordset || recordset.length === 0) {
    const e = new Error("Stored procedure returned no rows.");
    e.raw = JSON.stringify(result ?? {});
    throw e;
  }

  const row = recordset[0];

  const firstColName = row && Object.keys(row)[0];
  const jsonStr =
    row?.json ??
    row?.data ??
    (firstColName && typeof row[firstColName] === "string"
      ? row[firstColName]
      : null);

  if (typeof jsonStr !== "string") {
    const e = new Error(
      "Stored procedure did not return a JSON string in the first row."
    );
    e.raw = JSON.stringify(row ?? {});
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
  let { jsonData } = req.body;

  if (!spName || typeof spName !== "string") {
    return res.status(400).json({
      success: false,
      message: "The 'spName' parameter is required and must be a string.",
    });
  }
  if (!/^[A-Za-z0-9_.]+$/.test(spName)) {
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

    const results = [];
    for (const item of items) {
      const parsed = await execOnceJson(spName, item);
      results.push(parsed);
    }
    return res
      .status(200)
      .json({
        success: true,
        spName,
        batch: true,
        count: results.length,
        data: results,
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
