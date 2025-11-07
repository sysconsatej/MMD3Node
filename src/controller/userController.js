import jwt from "jsonwebtoken";
import {
  executeQuery,
  initializeConnection,
  closeConnection,
} from "../config/DBConfig.js";

export const loginUser = async (req, res) => {
  try {
    const { emailId, password } = req.query;

    if (!emailId || !password) {
      return res
        .status(400)
        .send({ message: "Email and password are required" });
    }

    const query = `
      SELECT
        u.name as userName,
        u.id AS userId,
        u.emailId,
        u.password,
        u.branchId,
        u.companyId,
        urm.roleId,
        r.name AS roleName,
        c.name as companyName
      FROM tblUser AS u
      LEFT JOIN tblUserRoleMapping AS urm ON u.id = urm.userId
      LEFT JOIN tblUser AS r ON urm.roleId = r.id
      LEFT JOIN tblCompany AS c ON u.companyId = c.id
      WHERE u.emailId = @emailId AND u.password = @password
    `;

    const parameters = { emailId, password };

    await initializeConnection();

    const result = await executeQuery(query, parameters);
    const user = result?.[0];

    if (!user) {
      return res.status(400).send({ message: "Invalid credentials" });
    }

    const key = process.env.JWT_TOKEN;
    const token = jwt.sign(
      { emailId: user.emailId, roleId: user.roleId },
      key,
      {
        expiresIn: "1d",
      }
    );

    const userData = {
      userId: user.userId,
      userName: user.userName,
      emailId: user.emailId,
      roleId: user.roleId,
      roleName: user.roleName,
      companyId: user.companyId,
      companyName: user.companyName,
      branchId: user.branchId,
    };

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // true for HTTPS
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // User data cookie (not httpOnly, so frontend can access it)
    res.cookie("user", JSON.stringify(userData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Redirect to frontend with token + userData encoded
    const redirectUrl = `http://localhost:3001/home`;

    console.log("Redirecting to:", redirectUrl);

    return res.redirect(redirectUrl);
  } catch (err) {
    return res.status(500).send({ message: "Internal server error" });
  } finally {
    await closeConnection();
  }
};
