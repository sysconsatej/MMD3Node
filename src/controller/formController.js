import {
  closeConnection,
  executeQuery,
  initializeConnection,
} from "../config/DBConfig.js";

export const insertUpdate = async (req, res) => {
  try {
    const { tableName, data, recordId = null } = req.body;

    if (!tableName || !data) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: 'tableName' and 'data'",
      });
    }

    await initializeConnection();

    const payload = { tableName, data, recordId };
    const query = `EXEC dbo.dynamicInsertUpdateApi @json = @json`;
    const parameters = { json: JSON.stringify(payload) };

    const rows = await executeQuery(query, parameters);

    return res.status(200).json({
      success: true,
      message: recordId
        ? "Form updated successfully"
        : "Form inserted successfully",
      result: rows,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error executing dynamicInsertUpdateApi",
      error: err.message,
    });
  } finally {
    await closeConnection();
  }
};

export const fetchForm = async (req, res) => {
  try {
    const { dropdownFields = [], parentTableName, recordId } = req.body;

    if (!parentTableName || !recordId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: 'parentTableName' and 'recordId'",
      });
    }

    await initializeConnection();

    const payload = {
      dropdownFields: JSON.stringify(dropdownFields),
      parentTableName,
      recordId,
    };
    const query = `EXEC fetchFormDataApi @dropdownFields = @dropdownFields, @parentTableName = @parentTableName, @recordId = @recordId`;
    const result = await executeQuery(query, payload);

    const jsonStr = Object.values(result[0])[0];
    const parsed = JSON.parse(jsonStr);

    return res.status(200).json({
      success: true,
      message: "Form fetch successfully",
      result: parsed,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error executing fetchFormDataApi",
      error: err.message,
    });
  } finally {
    await closeConnection();
  }
};
