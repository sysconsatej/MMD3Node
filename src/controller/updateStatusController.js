import {
  executeQuery,
} from "../config/DBConfig.js";

// tiny helper to parse JSON if a string sneaks in
const parseMaybeJson = (v) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

export const updateStatus = async (req, res) => {
  try {
    // accept JSON object, urlencoded, or raw text
    let body = parseMaybeJson(req.body);

    // support both rows and rowsJson keys; prefer rows
    let { tableName, rows, rowsJson, keyColumn = "id" } = body || {};
    if (!rows && rowsJson) rows = rowsJson;

    // if rows is a string (common with form-data/text), parse it
    rows = parseMaybeJson(rows);

    // minimal validation
    if (!tableName || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Missing fields: 'tableName' and non-empty 'rows[]' are required",
      });
    }


    // call your SP (your SP handles schema resolution)
    const params = {
      tableName,
      rowsJson: JSON.stringify(rows), // pass as NVARCHAR(MAX)
      keyColumn,
    };

    const query =
      "EXEC updatestatusapi @tableName=@tableName, @rowsJson=@rowsJson, @keyColumn=@keyColumn";
    const result = await executeQuery(query, params);

    // return whatever your DB wrapper yields (recordsets or flat array)
    return res.status(200).json({ success: true, result });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error executing updatestatusapi",
      error: err?.message || "Unknown error",
    });
  } 
};
