import {
  closeConnection,
  executeQuery,
  initializeConnection,
} from "../config/DBConfig.js";

export const getDropDownValues = async (req, res) => {
  const { masterName, pageNo = 1 } = req.body;

  if (!masterName) {
    return res
      .status(400)
      .json({ message: "The 'masterName' parameter is required" });
  }

  try {
    await initializeConnection();

    const query = `EXEC getDropdownApi @masterName = @masterName, @pageNo = @pageNo`;

    const parameters = { masterName, pageNo };

    const result = await executeQuery(query, parameters);
    const convertIntoJson = JSON.parse(result[0].data);
    const { data, totalPage } = convertIntoJson;

    if (data.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

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
