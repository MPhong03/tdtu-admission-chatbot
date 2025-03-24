const HttpResponse = require("../data/responses/http.response");
const AuthService = require("../services/auth.service");
const TurndownService = require("turndown");

class AuthController {
    constructor() {
        this.authService = new AuthService();
        this.turndownService = new TurndownService();

        this.register = this.register.bind(this);
        this.login = this.login.bind(this);
        this.hello = this.hello.bind(this);
        this.profile = this.profile.bind(this);
    }

    async hello(req, res) {
        const html = "<h1>Hướng dẫn xét tuyển</h1><p>Bạn cần đăng ký <a href='https://example.com'>tại đây</a>.</p>";

        res.json(HttpResponse.success(this.turndownService.turndown(html)));
    }

    async register(req, res) {
        try {
            const result = await this.authService.registerUser(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json(HttpResponse.error("Internal Server Error"));
        }
    }

    async login(req, res) {
        try {
            const result = await this.authService.loginUser(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json(HttpResponse.error("Internal Server Error"));
        }
    }

    async profile(req, res) {
        try {
            const result = await this.authService.getUserById(req.user.id);
            res.json(result);
        } catch (error) {
            res.status(500).json(HttpResponse.error("Internal Server Error"));
        }
    }
}

module.exports = new AuthController();
