import jwt from "jsonwebtoken";

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token === null)
    return res.status(401).send({ message: "Please provide token" });

  jwt.verify(token, process.env.JWT_TOKEN, (err, user) => {
    if (err) {
      return res.status(403).send({ message: "User is Restricted" });
    }
    req.user = user;
    next();
  });
};
