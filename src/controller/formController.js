import {
  closeConnection,
  executeQuery,
  initializeConnection,
} from "../config/DBConfig.js";

export const insertUpdate = async (req, res) => {
  try {
    const {
      tableName,
      submitJson,
      formId = null,
      parentColumnName = null,
    } = req.body;

    if (!tableName || !submitJson) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: 'tableName' and 'submitJson'",
      });
    }

    await initializeConnection();

    const parameters = {
      tableName,
      submitJson: submitJson,
      formId,
      parentColumnName,
    };
    const query = `EXEC dynamicMultiSubmit @tableName = @tableName, @submitJson = @submitJson, @formId = @formId, @parentColumnName = @parentColumnName`;

    const rows = await executeQuery(query, parameters);
    const jsonStr = Object.values(rows[0])[0];

    const { error, success } = JSON.parse(jsonStr);

    if (!success) {
      return res.status(500).json({
        success: false,
        message: "Error executing dynamicMultiSubmit",
        error: error,
      });
    }

    const uploadFiles = req?.files?.attachments;

    if (uploadFiles) {
      if (Array.isArray(uploadFiles)) {
        for (const file of uploadFiles) {
          await file.mv(`./uploads/${file.name}`);
        }
      } else {
        await uploadFiles.mv(`./uploads/${uploadFiles.name}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: formId
        ? "Form updated successfully"
        : "Form inserted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error executing dynamicMultiSubmit",
      error: err.message,
    });
  } finally {
    await closeConnection();
  }
};

export const fetchForm = async (req, res) => {
  try {
    const {
      dropdownFields = [],
      parentTableName,
      recordId,
      childTableNames,
      parentTableColumnName,
    } = req.body;

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
      childTableNames,
      parentTableColumnName,
    };
    const query = `EXEC fetchFormDataApi @dropdownFields = @dropdownFields, @parentTableName = @parentTableName, @recordId = @recordId, @childTableNames = @childTableNames, @parentTableColumnName = @parentTableColumnName`;
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

export const deleteRecord = async (req, res) => {
  try {
    const { recordId, tableName } = req.body;

    if (!tableName || !recordId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: 'tableName' and 'recordId'",
      });
    }

    await initializeConnection();

    const payload = {
      tableName,
      recordId,
    };

    const query = `EXEC deleteRecordApi @recordId = @recordId, @tableName = @tableName`;
    const result = await executeQuery(query, payload);

    const jsonStr = Object.values(result[0])[0];
    const parsed = JSON.parse(jsonStr);

    return res.status(200).json({
      success: true,
      message: "Record deleted successfully!",
      result: parsed,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error executing deleteRecordApi",
      error: err.message,
    });
  } finally {
    await closeConnection();
  }
};
