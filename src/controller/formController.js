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
