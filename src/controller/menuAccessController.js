import {
  closeConnection,
  executeQuery,
  initializeConnection,
} from "../config/DBConfig.js";

export const menuAccess = async (req, res) => {
  try {
    const { roleId, menu_json } = req.body;
    console.log(menu_json, "[][][");
    if (!roleId) {
      return res.status(400).json({ message: " roleId is required " });
    }
    await initializeConnection();
    const query = `EXEC  menuAccessApi  @menu_json=@menu_json, @roleId=@roleId `;
    const parameters = {
      roleId: roleId,
      menu_json: menu_json,
    };
    const result = await executeQuery(query, parameters);
    // console.log(result , 'res')
    return res.status(200).json({ message: "Data Inserted Successfully" });
  } catch (error) {
    return res.status(500).send({ errorMessage: error.message });
  } finally {
    await closeConnection();
  }
};

export const getMenuAccessDetails = async (req, res) => {
  try {
    const { roleId, menuName } = req.body;
    if (!roleId || !menuName) {
      return res
        .status(400)
        .json({ message: "RoleId  and MenuName is required " });
    }

    await initializeConnection();
    const query = `exec getUserAccessDetailsApi @roleId = @roleId , @menuName = @menuName`;
    const parameters = {
      roleId: roleId,
      menuName: menuName,
    };
    const userAccessDetails = await executeQuery(query, parameters);
    const jsonStr = Object.values(userAccessDetails[0])[0];
    const parsed = JSON.parse(jsonStr);
    return res.status(200).send({
      message: "Data successfully retrived",
      data: JSON.parse(parsed.data),
    });
  } catch (error) {
    return res.status(500).send({ errorMessage: error.message });
  } finally {
    await closeConnection();
  }
};

export const getAllAccessRelatedToRole = async (req, res) => {
  try {
    const roleId = req.body.roleId;

    await initializeConnection();
    //     const query = `
    // SELECT
    //     ur.menuButtonId,
    //     ur.accessFlag,
    //     mb.buttonName,
    //     mb.menuName

    // FROM
    //     tblUserAccess ur
    // JOIN
    //     tblMenuButton mb ON ur.menuButtonId = mb.id
    // WHERE
    //     ur.roleId = ${roleId} `;

    const query = `
      SELECT 
        ur.roleId, 
        ur.menuButtonId,
        ur.accessFlag,
        mb.buttonName,
        mb.menuName
      FROM 
        tblUserAccess ur
      JOIN 
        tblMenuButton mb ON ur.menuButtonId = mb.id
      WHERE 
        ur.roleId = ${roleId}`;

    const result = await executeQuery(query);
    return res
      .status(200)
      .json({ message: "Data retrived successfully", data: result });
  } catch (err) {
    return res.status(500).send({ message: err });
  } finally {
    await closeConnection();
  }
};
