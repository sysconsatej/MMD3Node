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
        r.roleCode as roleCode,
        b.name as branchName,
        c.name as companyName
      FROM tblUser AS u
      LEFT JOIN tblUserRoleMapping AS urm ON u.id = urm.userId
      LEFT JOIN tblUser AS r ON urm.roleId = r.id
      LEFT JOIN tblCompany AS c ON u.companyId = c.id
      LEFT JOIN tblCompanyBranch AS b ON u.branchId = b.id
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
      {
        userId: user.userId,
        userName: user.userName,
        emailId: user.emailId,
        roleId: user.roleId,
        roleName: user.roleName,
        roleCode: user.roleCode,
        companyId: user.companyId,
        companyName: user.companyName,
        branchId: user.branchId,
        branchName: user.branchName,
      },
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
      roleCode: user.roleCode,
      companyId: user.companyId,
      companyName: user.companyName,
      branchId: user.branchId,
      branchName: user.branchName,
    };

    res.cookie("token", token, {
      httpOnly: process.env.NODE_ENV === "production", // httpOnly in production
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
    const redirectUrl =
      process.env.NODE_ENV === "production"
        ? `${process.env.FRONT_END_URL_PROD}home`
        : `${process.env.FRONT_END_URL_STAG}home`;

    return res.redirect(redirectUrl);
  } catch (err) {
    return res.status(500).send({ message: "Internal server error" });
  } finally {
    await closeConnection();
  }
};

export const logoutUser = async (req, res) => {
  try {
    // Clear both cookies by overwriting them with expired values
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.clearCookie("user", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    //  const redirectUrl =
    //   process.env.NODE_ENV === "production"
    //     ? "https://mmd3.mastergroups.com/"
    //     : "https://mmd3.mastergroups.com/";

    // return res.redirect(redirectUrl);

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
