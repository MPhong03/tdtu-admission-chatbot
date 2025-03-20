const winston = require("winston");
const path = require("path");

// Cấu hình Winston logger
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [
        new winston.transports.Console({ format: winston.format.colorize() }),
        new winston.transports.File({ filename: path.join(__dirname, "../logs/error.log"), level: "error" }),
        new winston.transports.File({ filename: path.join(__dirname, "../logs/combined.log") })
    ]
});

class LoggerUtil {
    static info(message) {
        logger.info(message);
    }

    static warn(message) {
        logger.warn(message);
    }

    static error(message, error = null) {
        logger.error(message);
        if (error) logger.error(error.stack || error);
    }
}

module.exports = LoggerUtil;
