import "dotenv/config";
import express from "express";
import cors from "cors";

import dropDownValuesRoute from "./src/routes/dropDownRoute.js";

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to node.js!",
  });
});

app.use("/api/v1", dropDownValuesRoute);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
