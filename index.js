import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";
import { initializeConnection, closeConnection } from "./src/config/DBConfig.js"

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
import insertExternalDataApi from "./src/routes/inserteExternalDataRoute.js";
import chartRoute from "./src/routes/chart.route.js";



initializeConnection()
  .then(() => {
    console.log("Database connection established");
  })
  .catch((err) => {
    console.error("Error connecting to the database:", err);
    process.exit(1); // Exit the application if the connection fails
  });

const app = express();
app.use(express.json({ limit: "50mb" })); // increase size of payload
app.use(express.urlencoded({ limit: "50mb", extended: true })); // increase size of payload
app.use(cookieParser());
app.use(cors({ credentials: true, origin: true }));
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
app.use("/api/v1", insertExternalDataApi);
app.use("/api/v1/charts", chartRoute);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });

  await closeConnection();
  console.log("Database connection closed");

  process.exit(0);
});

// If using SIGINT (Ctrl+C) in terminal
process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });

  await closeConnection();
  console.log("Database connection closed");

  process.exit(0);
});

export default app;
