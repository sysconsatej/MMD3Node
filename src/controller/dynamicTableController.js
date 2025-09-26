import {
  closeConnection,
  executeQuery,
  initializeConnection,
  executeQuerySpData,
} from "../config/DBConfig.js";

export const getDynamicTable = async (req, res) => {
  const {
    columns,
    tableName,
    joins = "",
    searchColumn = null,
    searchValue = null,
    pageNo = 1,
    pageSize = 25,
  } = req.body;

  if (!columns || !tableName) {
    return res
      .status(400)
      .json({ message: "The 'columns and tableName' parameter is required" });
  }

  try {
    await initializeConnection();

    const query = `EXEC searchTableApi @columns = @columns, @tableName = @tableName, @joins = @joins, @searchColumn = @searchColumn, @searchValue = @searchValue, @pageNo = @pageNo, @pageSize = @pageSize`;

    const parameters = {
      columns,
      tableName,
      joins,
      searchColumn,
      searchValue,
      pageNo,
      pageSize,
    };

    const result = await executeQuery(query, parameters);
    const convertIntoJson = JSON.parse(result[0].data);
    const { data, totalPage, totalRows } = convertIntoJson;

    res.status(200).json({
      success: true,
      message: "Successfully fetched data",
      data: data,
      totalPage: totalPage,
      totalRows: totalRows,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error executing master API",
      error: err.message,
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
