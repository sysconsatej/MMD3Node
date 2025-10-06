import jwt from "jsonwebtoken";

const userConst = () =>
  new Promise((reslove) => {
    reslove({
      username: "test@gmail.com",
      password: "abc",
    });
  });

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username && !password) {
      return res
        ?.status(400)
        .send({ message: "Username and Password are required" });
    }

    const fetchUserFromDb = await userConst(); 
    if (
      fetchUserFromDb.username !== username ||
      fetchUserFromDb.password !== password
    ) {
      return res.status(400).send({ message: " Invlaid Credentials" });
    }

    const key = process.env.JWT_TOKEN;
    const token = jwt.sign({ username: fetchUserFromDb.username }, key, {
      expiresIn: "1h",
    });

    return res.status(200).send({
      message: "Login successful",
      token: token,
    });
  } catch (err) {
    return res.status(500).send({ errorMessage: err });
  }
};
