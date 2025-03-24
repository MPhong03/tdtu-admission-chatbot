const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./configs/db.config");
const apiRoutes = require("./routes/index.route");
const Logger = require("./utils/logger.util");
const HttpResponse = require("./data/responses/http.response");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

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


// EXCEPTION
app.use((err, req, res, next) => {
    Logger.error("Unhandled Error", err);
    res.status(500).json(HttpResponse.error("Internal Server Error"));
});

app.use((req, res, next) => {
    res.status(404).json(HttpResponse.error("Route Not Found"));
});

module.exports = app;