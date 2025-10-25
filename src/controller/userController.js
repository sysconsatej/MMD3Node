import jwt from "jsonwebtoken";
import { executeQuery } from "../config/DBConfig.js";

export const loginUser = async (req, res) => {
  try {
    const { emailId, password } = req.body;

    if (!emailId || !password) {
      return res
        .status(400)
        .send({ message: "Email and password are required" });
    }

    const query = `SELECT * from tblUser  WHERE emailId=@emailId AND password=@password`;

    const parameters = { emailId: emailId, password: password };

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
        expiresIn: "10s",
      }
    );

    return res.status(200).send({
      message: "Login successful",
      token,
      user: {
        emailId: user.emailId,
        roleId: user.roleId || 3,
      },
    });
  } catch (err) {
    console.error("Error in loginUser:", err);
    return res.status(500).send({ message: "Internal server error" });
  }
};
