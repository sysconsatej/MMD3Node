import {
  closeConnection,
  executeQuery,
  initializeConnection,
} from "../config/DBConfig.js";

export const getDropDownValues = async (req, res) => {
  const { masterName, pageNo = 1, search = "", selectedCondition } = req.body;

  if (!masterName) {
    return res
      .status(400)
      .json({ message: "The 'masterName' parameter is required" });
  }

  try {
    await initializeConnection();

    const query = `EXEC getDropdownApi @masterName = @masterName, @pageNo = @pageNo, @search = @search, @selectedCondition = @selectedCondition`;

    const parameters = { masterName, pageNo, search, selectedCondition };

    const result = await executeQuery(query, parameters);
    const convertIntoJson = JSON.parse(result[0].data);
    const { data, totalPage } = convertIntoJson;

    res.status(200).json({
      success: true,
      message: "Successfully fetched data",
      labelType: masterName,
      data: data,
      totalPage: totalPage,
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

export const getTableValues = async (req, res) => {
  const { columns, tableName, whereCondition = null, orderBy = 1 } = req.body;

  if (!columns || !tableName) {
    return res
      .status(400)
      .json({ message: "The 'columns' or 'tableName' parameter is required" });
  }

  try {
    await initializeConnection();

    const query = `EXEC getDataApi @columns = @columns, @tableName = @tableName, @whereCondition = @whereCondition, @orderBy = @orderBy`;

    const parameters = { columns, tableName, whereCondition, orderBy };

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
  } finally {
    await closeConnection();
  }
};

export const nextPrevData = async (req, res) => {
  const { formId, orderBy = "id", columnName, tableName } = req.body;

  if (!formId || !columnName || !tableName) {
    return res.status(400).json({
      message:
        "The 'columnName' or 'formId' or 'tableName' parameter is required",
    });
  }

  try {
    await initializeConnection();

    const query = `EXEC nextPrevDataApi @formId = @formId, @columnName = @columnName, @tableName = @tableName, @orderBy = @orderBy`;

    const parameters = { formId, columnName, tableName, orderBy };

    const result = await executeQuery(query, parameters);

    res.status(200).json({
      success: true,
      message: "Successfully fetched data",
      data: result[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error executing nextPrevDataApi API",
      error: err.message,
    });
  } finally {
    await closeConnection();
  }
};
