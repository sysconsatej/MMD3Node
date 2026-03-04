import { executeQuery } from "../config/DBConfig.js";

export const menuAccess = async (req, res) => {
  try {
    const { roleId, menu_json } = req.body;
    if (!roleId) {
      return res.status(400).json({ message: " roleId is required " });
    }
    //
    const query = `EXEC  menuAccessApi  @menu_json=@menu_json, @roleId=@roleId `;
    const parameters = {
      roleId: roleId,
      menu_json: menu_json,
    };
    const result = await executeQuery(query, parameters);
    return res.status(200).json({ message: "Data Inserted Successfully" });
  } catch (error) {
    return res.status(500).send({ errorMessage: error.message });
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

    //
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
  }
};

export const getAllAccessRelatedToRole = async (req, res) => {
  try {
    const userId = req.user.userId;
    const params = { userId: userId };
    const query = `EXEC sp_GetUserMenuAccess @userId = @userId`;

    const result = await executeQuery(query, params);

    const d = Object.values(result[0])[0];
    const s = JSON.parse(d);

    return res
      .status(200)
      .json({ message: "Data retrived successfully", data: s });
  } catch (err) {
    return res.status(500).send({ message: err });
  }
};

export const getSpecificRoleData = async (req, res) => {
  try {
    const roleId = req?.body?.roleId;

    if (!roleId) {
      return res.status(400).json({ message: "roleId is required" });
    }

    const query = `EXEC spGetMenuAccessByRole @roleId = ${roleId}`;

    const result = await executeQuery(query);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    const jsonData = Object.values(result[0])[0];
    const parsedData = JSON.parse(jsonData);

    return res.status(200).json({
      message: "Data retrieved successfully",
      data: parsedData,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || err,
    });
  }
};
