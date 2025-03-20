const AuthService = require("../services/auth.service");

class AuthController {
    constructor() {
        this.authService = new AuthService();

        this.register = this.register.bind(this);
        this.login = this.login.bind(this);
        this.hello = this.hello.bind(this);
        this.profile = this.profile.bind(this);
    }

    async hello(req, res) {
        res.json({ 
            Code: 1, 
            Message: "Hello World", 
            Data: null 
        });
    }

    async register(req, res) {
        try {
            const result = await this.authService.registerUser(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ 
                Code: -1, 
                Message: "Internal Server Error", 
                Data: null 
            });
        }
    }

    async login(req, res) {
        try {
            const result = await this.authService.loginUser(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ 
                Code: -1, 
                Message: "Internal Server Error", 
                Data: null 
            });
        }
    }

    async profile(req, res) {
        try {
            const result = await this.authService.getUserById(req.user.id);
            res.json(result);
        } catch (error) {
            res.status(500).json({
                Code: -1,
                Message: "Internal Server Error",
                Data: null
            });
        }
    }
}

module.exports = new AuthController();
