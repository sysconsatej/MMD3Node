import {
  closeConnection,
  executeQuery,
  initializeConnection,
} from "../config/DBConfig.js";

export const menuAccess = async (req, res) => {
  try {
    const { roleId, menu_json } = req.body;
    if (!roleId) {
      return res.status(400).json({ message: " roleId is required " });
    }
    await initializeConnection();
    const query = `EXEC  menuAccessApi`;
    const parameteres = {
      userId: roleId,
      menu_json,
    };
    const result = await executeQuery(query, parameteres);
    console.log(result, "[][][][]");
  } catch (error) {
    return res.status(500).send({ errorMessage: error.message });
  } finally {
    await closeConnection();
  }
};

export const getMenuAccessDetails = async (req, res) => {
  try {
    const { roleId } = req.params;
    if (!roleId) {
      return res.status(400).json({ message: "roleId is required " });
    }

    await initializeConnection();
    const query = `EXEC getUserAccessDetails @roleId=${roleId}`;
    const userAccessDetails = await executeQuery(query);
    // const data = userAccessDetails
    //   ? JSON.parse(userAccessDetails)
    //   : [];
    console.log();

    return res.status(200).json({
      message: "Data successfully retrived",
      data: JSON.parse(userAccessDetails[0]?.["JSON_F52E2B61-18A1-11d1-B105-00805F49916B"]),
    });
  } catch (error) {
    return res.status(500).send({ errorMessage: error.message });
  } finally {
    await closeConnection();
  }
};
