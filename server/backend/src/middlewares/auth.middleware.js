const jwt = require("jsonwebtoken");
const HttpResponse = require("../data/responses/http.response");
const { v4: uuidv4 } = require("uuid");

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

// Có thể dùng cho khách vãng lai

function extractToken(authHeader) {
    if (!authHeader) return null;
    return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
}

// Middleware: Bắt buộc đăng nhập
function requireAuth(req, res, next) {
    const token = extractToken(req.header("Authorization"));
    if (!token) {
        return res.status(401).json(HttpResponse.error("Access Denied"));
    }
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json(HttpResponse.error("Invalid Token"));
    }
}

// Middleware: Tùy chọn xác thực (có token thì gán user, không thì bỏ qua)
function optionalAuth(req, res, next) {
    const token = extractToken(req.header("Authorization"));
    let user = null;
    if (token) {
        try {
            user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            // Token sai thì bỏ qua, không gán user
        }
    }

    req.user = user || null;
    req.visitorId = req.header("X-Visitor-Id") || req.query.visitorId || req.body.visitorId || uuidv4();
    req.isVisitor = user ? false : true;

    next();
}

module.exports = { verifyToken, isAdmin, requireAuth, optionalAuth };
