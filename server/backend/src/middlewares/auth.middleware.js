const jwt = require("jsonwebtoken");

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
        res.json({ 
            Code: -1, 
            Message: "Invalid Token", 
            Data: null 
        });
    }
};

const isAdmin = (req, res, next) => {
    if (!req.user) 
        return res.json({ Code: -1, Message: "User not authenticated", Data: null });

    if (req.user.role !== "admin") 
        return res.json({ Code: -1, Message: "Admin Access Required", Data: null });
    
    next();
};

module.exports = { verifyToken, isAdmin };
