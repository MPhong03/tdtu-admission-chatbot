const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");

const connectDB = require("./configs/db.config");
const apiRoutes = require("./routes/index.route");
const Logger = require("./utils/logger.util");
const HttpResponse = require("./data/responses/http.response");
const initSocketHandler = require("./handlers/socket.handler");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

module.exports = { app, server };