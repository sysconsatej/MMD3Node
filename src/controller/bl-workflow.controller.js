import { executeQuery } from "../config/DBConfig.js";

export const blWorkFlow = async (req, res) => {
  const { blNo } = req?.params;
  if (!blNo) {
    return res.status(400).send({ message: "Provide Bl No" });
  }

  try {
    const params = {
      blNo: `${blNo}`,
    };
    const query = "EXEC blWorkFlow  @blNo = @blNo";
    const data = await executeQuery(query, params);
    const result  = JSON.parse(Object.values(data[0])[0])
    return res.status(200).send({ message: "Data Fetched SuccessFully" , data  : result });
  } catch (err) {
    return res.status(500).send({ message: err, status: false });
  }
};
