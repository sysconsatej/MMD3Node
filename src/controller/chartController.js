import { executeQuery } from "../config/DBConfig.js";

export const getChartData = async (req, res) => {
  try {
    const spName = req?.params?.spName;

    if (!spName) {
      return res.status(400).json({
        success: false,
        message: "Provide chart Name",
      });
    }

    const companyId = req?.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "CompanyId not found in token",
      });
    }

    const filterCondition = JSON.stringify({
      companyId,
    });

    const parameters = {
      filterCondition,
    };

    const query = `EXEC ${spName} @filterCondition = @filterCondition`;

    const data = await executeQuery(query, parameters);
    const parsedData =  JSON.parse(JSON.stringify(Object.values(data[0])[0]))  ||  [];
    const chartData = JSON.parse(parsedData)  ||  [];

    console.log(chartData)

    return res.status(200).json({
      success: true,
      message: "Successfully fetched chart data",
      data: chartData || [],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `${error}` });
  }
};
