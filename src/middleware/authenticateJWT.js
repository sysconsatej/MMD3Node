// middleware/authenticateJWT.js
import jwt from "jsonwebtoken";

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token =  req.cookies?.token  ||  authHeader?.split(" ")[1]; // safely get token

  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_TOKEN); // standard secret name
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(403).json({ message: "Invalid token" });
  }
};
