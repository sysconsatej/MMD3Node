import {
  closeConnection,
  executeQuery,
  initializeConnection,
} from "../config/DBConfig.js";

export const getDropDownValues = async (req, res) => {
  const { masterName } = req.body;

  if (!masterName) {
    return res
      .status(400)
      .json({ message: "The 'masterName' parameter is required" });
  }

  try {
    await initializeConnection();

    const query = `EXEC getDropdownApi @masterName = @masterName`;

    const parameters = { masterName };

    const result = await executeQuery(query, parameters);

    if (result.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    res.status(200).json({
      success: true,
      message: "Successfully fetched data",
      labelType: masterName,
      data: result,
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
