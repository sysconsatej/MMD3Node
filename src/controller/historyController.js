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

    const recordId = Number(id);
    if (Number.isNaN(recordId)) {
      return res.status(400).json({
        success: false,
        message: "id must be a valid number",
      });
    }

    if (!tableName.includes(".")) {
      tableName = `dbo.${tableName}`;
    }

    const query = `
      SELECT
        t.EventDate AS date,
        usr.emailId AS loginId,
        newValue.name AS status
      FROM dbo.fn_AuditLogSummary(@tableName, @recordId) t
      LEFT JOIN tblMasterData oldValue ON oldValue.id = t.OldValue
      LEFT JOIN tblMasterData newValue ON newValue.id = t.NewValue
      LEFT JOIN tblUser usr ON usr.id = t.UpdatedBy
      WHERE t.ColumnName = 'hblRequestStatus'
      ORDER BY t.PrimaryKeyId, t.EventDate, t.ColumnName;
    `;

    const params = {
      tableName,
      recordId,
    };

    const data = await executeQuery(query, params);

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
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// export const getInvoiceHistory = async (req, res) => {
//   try {
//     let { tableName, id } = req.query;

//     if (!tableName || !id) {
//       return res.status(400).json({
//         success: false,
//         message: "tableName and id are required",
//       });
//     }

//     const recordId = Number(id);
//     if (Number.isNaN(recordId)) {
//       return res.status(400).json({
//         success: false,
//         message: "id must be a valid number",
//       });
//     }

//     if (!tableName.includes(".")) {
//       tableName = `dbo.${tableName}`;
//     }

//     const query = `
//       SELECT
//         @recordId AS recordId,
//         t.EventDate AS date,
//         usr.name AS loginName,
//         usr.emailId AS loginId,
//         shippingLine.name AS shippingLine,
//         shippingLine.emailId AS shippingLineEmailId,
//         shippingLine.telephoneNo AS shippingLineTelephoneNo,
//         ir.rejectRemarks AS rejectionRemarks,
//         ir.remarks AS remarks,
//         newValue.name AS status
//       FROM dbo.fn_AuditLogSummary(@tableName, @recordId) t
//       LEFT JOIN tblMasterData oldValue ON oldValue.id = t.OldValue
//       LEFT JOIN tblMasterData newValue ON newValue.id = t.NewValue
//       INNER JOIN tblInvoiceRequest ir ON ir.id = @recordId
//       LEFT JOIN tblCompany shippingLine ON shippingLine.id = ir.shippingLineId
//       LEFT JOIN tblUser usr ON usr.id = t.UpdatedBy
//       WHERE t.ColumnName = 'invoiceRequestStatusId'
//       ORDER BY t.PrimaryKeyId, t.EventDate, t.ColumnName;
//     `;

//     const params = {
//       tableName,
//       recordId,
//     };

//     const data = await executeQuery(query, params);

//     let rows = [];
//     if (Array.isArray(data) && data[0]?.recordset) {
//       rows = data[0].recordset;
//     } else if (data?.recordset) {
//       rows = data.recordset;
//     } else {
//       rows = data;
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Successfully fetched invoice history",
//       data: rows,
//     });
//   } catch (error) {
//     console.log("Error fetching invoice history:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };
export const getInvoiceHistory = async (req, res) => {
  try {
    let { recordId } = req.query;

    if (!recordId) {
      return res.status(400).json({
        success: false,
        message: "recordId is required",
      });
    }

    recordId = Number(recordId);
    if (Number.isNaN(recordId)) {
      return res.status(400).json({
        success: false,
        message: "recordId must be a valid number",
      });
    }

    const jsonPayload = JSON.stringify({ recordId });

    const query = `
      EXEC dbo.getInvoiceRequestHistory @json = @jsonPayload;
    `;

    const data = await executeQuery(query, { jsonPayload });

    const rows = data?.[0]?.recordset || data?.recordset || data || [];

    if (!rows.length) {
      return res.status(200).json({
        success: true,
        message: "No data found",
        data: [],
      });
    }

    const jsonKey = Object.keys(rows[0])[0];

    let parsed = [];
    try {
      parsed = JSON.parse(rows[0][jsonKey]);
    } catch (e) {
      parsed = [];
    }

    return res.status(200).json({
      success: true,
      message: "Successfully fetched invoice history",
      data: parsed,
    });
  } catch (error) {
    console.log("Error executing SP:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getInvoiceReleaseHistoryAPI = async (req, res) => {
  try {
    let { recordId } = req.query;

    if (!recordId) {
      return res.status(400).json({
        success: false,
        message: "recordId is required",
      });
    }

    recordId = Number(recordId);

    const jsonPayload = JSON.stringify({ recordId });

    const query = `
      EXEC dbo.getInvoiceReleaseHistory @json = @jsonPayload;
    `;

    const params = { jsonPayload };

    const data = await executeQuery(query, params);

    let rows = [];

    if (Array.isArray(data) && data[0]?.recordset) {
      rows = data[0].recordset;
    } else if (data?.recordset) {
      rows = data.recordset;
    } else {
      rows = data;
    }

    if (!rows.length) {
      return res.status(200).json({
        success: true,
        message: "No data found",
        data: [],
      });
    }

    const jsonKey = Object.keys(rows[0])[0];

    const parsed = JSON.parse(rows[0][jsonKey]);

    return res.status(200).json({
      success: true,
      message: "Successfully fetched SP history",
      data: parsed,
    });
  } catch (error) {
    console.log("Error executing SP:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const getHistoryAPI = async (req, res) => {
  try {
    let { recordId, spName } = req.query;

    if (!spName) {
      return res.status(400).json({
        success: false,
        message: "spName is required",
      });
    }

    if (!recordId) {
      return res.status(400).json({
        success: false,
        message: "recordId is required",
      });
    }

    recordId = Number(recordId);

    if (Number.isNaN(recordId)) {
      return res.status(400).json({
        success: false,
        message: "recordId must be number",
      });
    }

    // 🔒 thoda safety – random SQL inject na ho
    if (!/^[a-zA-Z0-9_.]+$/.test(spName)) {
      return res.status(400).json({
        success: false,
        message: "Invalid spName",
      });
    }

    const jsonPayload = JSON.stringify({ recordId });

    const query = `
      EXEC ${spName} @json = @jsonPayload;
    `;

    const params = { jsonPayload };

    const data = await executeQuery(query, params);

    let rows = [];

    if (Array.isArray(data) && data[0]?.recordset) {
      rows = data[0].recordset;
    } else if (data?.recordset) {
      rows = data.recordset;
    } else {
      rows = data || [];
    }

    if (!rows.length) {
      return res.status(200).json({
        success: true,
        message: "No data found",
        data: [],
      });
    }

    // SP se FOR JSON PATH aata hai
    const jsonKey = Object.keys(rows[0])[0];
    const parsed = JSON.parse(rows[0][jsonKey]);

    return res.status(200).json({
      success: true,
      message: "Successfully fetched SP history",
      data: parsed,
    });
  } catch (error) {
    console.error("Error executing SP:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
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
