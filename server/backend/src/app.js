const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const connectDB = require("./configs/db.config");
const apiRoutes = require("./routes/index.route");
const Logger = require("./utils/logger.util");
const HttpResponse = require("./data/responses/http.response");
const initSocketHandler = require("./handlers/socket.handler");
const { default: axios } = require("axios");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(compression()); // Enable compression for better performance
app.use(helmet()); // Add security headers
app.use(rateLimit({
  windowMs: 10 * 60 * 1000,  // 15 phút
  max: 100,                  // Mỗi IP tối đa 100 request/10p
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later."
}));

// LOG REQUEST
app.use((req, res, next) => {
    Logger.info(`Request: ${req.method} ${req.originalUrl}`);
    Logger.info(`Headers: ${JSON.stringify(req.headers)}`);
    if (Object.keys(req.body).length) {
        Logger.info(`Body: ${JSON.stringify(req.body)}`);
    }
    if (Object.keys(req.query).length) {
        Logger.info(`Params: ${JSON.stringify(req.query)}`);
    }
    next();
});

// ROUTE
app.use("/api", apiRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// WEB SOCKET 
const server = http.createServer(app);
const io = new socketIO.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

initSocketHandler(io);

// EXCEPTION
app.use((err, req, res, next) => {
    Logger.error("Unhandled Error", err);
    res.status(500).json(HttpResponse.error("Internal Server Error"));
});

app.use((req, res, next) => {
    res.status(404).json(HttpResponse.error("Route Not Found"));
});

// // PING ON RENDER
// const APP_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
// // Tự ping mỗi 14 phút (trước khi sleep 15 phút)
// if (process.env.NODE_ENV === 'production') {
//     setInterval(async () => {
//         try {
//             await axios.get(`${APP_URL}/health`);
//             console.log('Self-ping successful');
//         } catch (error) {
//             console.log('Self-ping failed:', error.message);
//         }
//     }, 13 * 60 * 1000); // 14 phút
// }

module.exports = { app, server };