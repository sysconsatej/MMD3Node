import "dotenv/config";
import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";

import dropDownValuesRoute from "./src/routes/utilsRoute.js";
import dynamicTableRoute from "./src/routes/dynamicTableRoute.js";
import formRoute from "./src/routes/formRoute.js";
import updateStatusRoute from "./src/routes/updateStatusRoute.js";
import dynamicReport from "./src/routes/dynamicReportRoute.js";
import emailPdfReports from "./src/routes/reportsRoute.js";
import userRoute from "./src/routes/userRoute.js";
import menuButtonRoute from "./src/routes/menuButtonRoute.js";
import accessRoute from "./src/routes/menuAccess.route.js";
import paymentRoutes from "./src/routes/payment.route.js";
import uploadRoute from "./src/routes/uploadRoute.js";



const app = express();
app.use(express.json());
app.use(cors());
app.use(fileUpload({ createParentPath: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next(); // continue to the next middleware
});

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
app.use("/api/v1", updateStatusRoute);
app.use("/api/v1", dynamicReport);

app.use("/api/v1/reports", emailPdfReports);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/menuButton", menuButtonRoute);
app.use("/api/v1/access", accessRoute);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1", uploadRoute);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



export default app;
