import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs";

const logDir = "logs";

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const allLogsTransport = new DailyRotateFile({
  filename: `${logDir}/combined-%DATE%.log`,
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,      // compress old logs
  maxSize: "20m",           // rotate if file exceeds 20MB
  maxFiles: "14d",          // keep logs for 14 days
});

// Daily rotate file for ERROR logs only
const errorLogsTransport = new DailyRotateFile({
  filename: `${logDir}/error-%DATE%.log`,
  datePattern: "YYYY-MM-DD",
  level: "error",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
});

const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports: [
    allLogsTransport,
    errorLogsTransport,
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

export default logger;