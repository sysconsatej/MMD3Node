import "dotenv/config";
import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";

import dropDownValuesRoute from "./src/routes/utilsRoute.js";
import dynamicTableRoute from "./src/routes/dynamicTableRoute.js";
import formRoute from "./src/routes/formRoute.js";

const app = express();
app.use(express.json());
app.use(cors());
app.use(fileUpload({ createParentPath: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const port = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to node.js!",
  });
});
app.use("/api/v1", dropDownValuesRoute);
app.use("/api/v1", dynamicTableRoute);
app.use("/api/v1/form", formRoute);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
