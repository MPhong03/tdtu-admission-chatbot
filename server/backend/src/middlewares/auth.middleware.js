const jwt = require("jsonwebtoken");
const HttpResponse = require("../data/responses/http.response");

const verifyToken = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        return res.json({ Code: -1, Message: "Access Denied", Data: null });
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.json(HttpResponse.error("Invalid Token"));
    }
};

const isAdmin = (req, res, next) => {
    if (!req.user) 
        return res.json(HttpResponse.error("User not authenticated"));

    if (req.user.role !== "admin") 
        return res.json(HttpResponse.error("Admin Access Required"));
    
    next();
};

module.exports = { verifyToken, isAdmin };
