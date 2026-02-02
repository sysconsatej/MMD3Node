import {
  closeConnection,
  executeQuery,
  initializeConnection,
} from "../config/DBConfig.js";

export const getDropDownValues = async (req, res) => {
  let {
    masterName,
    tableName,
    displayColumn = "name",
    pageNo = 1,
    pageSize = 50,
    search = "",
    idColumn = "id",
    joins = "",
    where = "",
    searchColumn = null,
    orderBy = null,
    filtersJson = null,
  } = req.body;

  if (!tableName && masterName) {
    const parts = String(masterName)
      .split(",")
      .map((s) => s.trim());
    const disp = parts[0] || "name";
    const tblRaw = parts[1] || "tblMasterData";
    const hasAlias = tblRaw.includes(" ");
    const alias = hasAlias ? tblRaw.split(" ").slice(-1)[0] : "t";
    tableName = hasAlias ? tblRaw : `${tblRaw} ${alias}`;
    displayColumn = disp.includes(".") ? disp : `${alias}.${disp}`;
  }

  if (!tableName) {
    return res.status(400).json({
      success: false,
      message: "Either 'tableName' or 'masterName' is required",
    });
  }

  const filtersJsonStr =
    typeof filtersJson === "string"
      ? filtersJson
      : filtersJson
        ? JSON.stringify(filtersJson)
        : null;

  const query = `
    EXEC getDropdownApi
      @tableName=@tableName,
      @displayColumn=@displayColumn,
      @pageNo=@pageNo,
      @pageSize=@pageSize,
      @search=@search,
      @idColumn=@idColumn,
      @joins=@joins,
      @where=@where,
      @searchColumn=@searchColumn,
      @orderBy=@orderBy,
      @filtersJson=@filtersJson
  `;

  const parameters = {
    tableName,
    displayColumn,
    pageNo,
    pageSize,
    search,
    idColumn,
    joins,
    where,
    searchColumn,
    orderBy,
    filtersJson: filtersJsonStr,
  };

  try {
    const result = await executeQuery(query, parameters);

    const jsonStr =
      result?.[0]?.data ||
      result?.[0]?.Data ||
      JSON.stringify({ data: [], totalPage: 0 });

    const parsed = JSON.parse(jsonStr);
    const { data = [], totalPage = 0 } = parsed || {};

    res.status(200).json({
      success: true,
      message: data.length ? "Successfully fetched data" : "No data",
      labelType: masterName || `${displayColumn},${tableName}`,
      data,
      totalPage,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error executing dropdown API",
      error: err.message,
    });
  }
};

export const getTableValues = async (req, res) => {
  const {
    columns,
    tableName,
    whereCondition = null,
    orderBy = 1,
    joins = "",
  } = req.body;

  if (!columns || !tableName) {
    return res
      .status(400)
      .json({ message: "The 'columns' or 'tableName' parameter is required" });
  }

  try {
    const query = `EXEC getDataApi @columns = @columns, @tableName = @tableName, @whereCondition = @whereCondition, @orderBy = @orderBy, @joins = @joins`;

    const parameters = { columns, tableName, whereCondition, orderBy, joins };

    const result = await executeQuery(query, parameters);
    const jsonStr = result[0] === undefined ? [] : Object.values(result[0])[0];
    const parsed = jsonStr ? JSON.parse(jsonStr) : [];

    res.status(200).json({
      success: true,
      message:
        parsed.length === 0 ? "No Data Available" : "Successfully fetched data",
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

export const nextPrevData = async (req, res) => {
  const {
    formId,
    orderBy = "",
    columnNames,
    tableName,
    groupBy = "",
    where = "",
    joins = "",
  } = req.body;

  if (!formId || !columnNames || !tableName) {
    return res.status(400).json({
      message:
        "The 'columnName' or 'formId' or 'tableName' parameter is required",
    });
  }

  try {
    const query = `EXEC nextPrevDataApi @formId = @formId, @columnNames = @columnNames, @tableName = @tableName, @orderBy = @orderBy, @groupBy = @groupBy, @where = @where, @joins = @joins`;

    const parameters = {
      formId,
      columnNames,
      tableName,
      orderBy,
      groupBy,
      where,
      joins,
    };

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
  }
};
