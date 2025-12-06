import { executeQuery } from "../config/DBConfig.js";

export const getHistoryData = async (req, res) => {
  try {
    let { tableName, id } = req.query;

    if (!tableName || !id) {
      return res.status(400).json({
        success: false,
        message: "tableName and id are required",
      });
    }

    if (!tableName.includes(".")) {
      tableName = `dbo.${tableName}`;
    }

    const recordId = Number(id);

    const query = `
      SELECT *
      FROM dbo.fn_AuditLogSummary(@tableName, @recordId)
      ORDER BY EventDate DESC;
    `;

    const parameters = { tableName, recordId };

    const data = await executeQuery(query, parameters);

    let rows = [];
    if (Array.isArray(data) && data[0]?.recordset) {
      rows = data[0].recordset;
    } else if (data?.recordset) {
      rows = data.recordset;
    } else {
      rows = data;
    }

    return res.status(200).json({
      success: true,
      message: "Successfully fetched history data",
      data: rows,
    });
  } catch (error) {
    console.log("Error fetching history data:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const getHblColumnChanges = async (req, res) => {
  const { ids } = req.body;

  if (!ids) {
    return res.status(400).json({ message: "The 'ids' parameter is required" });
  }

  try {
    const query = `EXEC hblColumnChange @ids = @ids`;

    const parameters = { ids };

    const result = await executeQuery(query, parameters);
    const jsonStr = Object.values(result[0])[0];
    const parsed = JSON.parse(jsonStr);

    res.status(200).json({
      success: true,
      message: "Successfully fetched data",
      data: parsed,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error executing getDataApi API",
      error: err.message,
    });
  }
};
