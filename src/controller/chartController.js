import {
  executeQuery,
} from "../config/DBConfig.js";

export const getChartData = async (req, res) => {
  try {
    //
    const query = "EXEC companyCountryData @clientId = @clientId";
    const parameters = {
      clientId: 3,  // static clientId as per requirement
    };
    const data = await executeQuery(query, parameters);
    const parsedData = JSON.parse(JSON.stringify(Object.values(data[0])[0]));

    return res.status(200).json({
      success: true,
      message: "Successfully fetched chart data",
      data: JSON.parse(parsedData),
    });
  } catch (error) {
    console.log("Error fetching chart data:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  } 
};
