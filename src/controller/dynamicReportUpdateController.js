import { initializeConnection, closeConnection, executeQuerySpData } from "../config/DBConfig.js";

export const dynamicReportUpdate = async (req, res) => {
  const spName = req.body?.spName || req.body?.spname;
  let { jsonData } = req.body;

  // basic validation
  if (!spName || typeof spName !== "string" || !/^[A-Za-z0-9_.]+$/.test(spName)) {
    return res.status(400).json({
      success: false,
      message: "Invalid or missing 'spName'. Only letters, numbers, underscore, and dot are allowed.",
    });
  }

  // accept object or array; coerce to array
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

        // very light parsing: if first row has a string JSON, parse it, else return raw recordset
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
