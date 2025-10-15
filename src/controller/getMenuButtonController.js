import {
  executeQuery,
  initializeConnection,
  closeConnection,
} from "../config/DBConfig.js";

export const getMenuButton = async (req, res) => {
  const query = `EXEC getMenuButtons`;

  try {
    await initializeConnection();
    const menuButtons = await executeQuery(query);
    const data = JSON.parse(menuButtons[0].MenuButtonJson) || [];
    return res.status(200).json({
      success: true,
      menuButtons: data,
    });
  } catch (error) {
    console.log("Error in getMenuButton:", error);
    return res.status(500).send({ errorMessage: error.message });
  } finally {
    closeConnection();
  }
};

export const updateMenuButton = async (req, res) => {
  try {
    const { id, status } = req.body;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "menuButtonJson is required",
      });
    }
    const q = `update tblMenuButton set status  = ${status} where id = ${id}`;
    await initializeConnection();
    await executeQuery(q);
    return res.status(200).json({
      success: true,
      message: "Menu button status updated successfully",
    });
  } catch (error) {
    console.log("Error in updateMenuButton:", error);
    return res.status(500).send({ errorMessage: error.message });
  } finally {
    closeConnection();
  }
};
