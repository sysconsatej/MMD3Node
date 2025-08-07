import {
  closeConnection,
  executeQuery,
  initializeConnection,
} from "../config/DBConfig.js";

export const getDynamicTable = async (req, res) => {
  const {
    columns,
    tableName,
    joins = "",
    searchColumn = null,
    searchValue = null,
    pageNo = 1,
    pageSize = 15,
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
