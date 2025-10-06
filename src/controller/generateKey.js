import { randomBytes } from "node:crypto";

const generateKey = () => {
  const key = randomBytes(32).toString("hex");
  console.log(key, "key");
};
generateKey();
