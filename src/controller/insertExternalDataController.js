import {
    closeConnection,
    executeQuery,
    initializeConnection,
} from "../config/DBConfig.js";

export const insertExternalData = async (req, res) => {
  try {
    const { json,  } = req.body;

    // Basic validation
    if (!json) {
      return res.status(400).send({
        success: false,
        message: "Missing required fields: 'tableName' and 'submitJson'",
      });
    }

    // Initialize DB connection
    await initializeConnection();

    // Execute stored procedure
    const parameters = { json };
    const query = `EXEC insertExternalData 
                    @json = @json`;

    const rows = await executeQuery(query, parameters);
    const jsonStr = rows?.[0] ? Object.values(rows[0])[0] : null;
    const parsed = jsonStr ? JSON.parse(jsonStr) : null;

    if (!parsed?.success) {
      return res.status(500).send({
        success: false,
        message: "Error executing dynamicMultiSubmit",
        error: parsed?.error || "Unknown error",
      });
    }

    // Success response
    return res.send({
      success: true,
      message: formId
        ? "Form updated successfully!"
        : "Form inserted successfully!",
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Error executing dynamicMultiSubmit",
      error: error.message,
    });
  } finally {
    await closeConnection();
  }
}







