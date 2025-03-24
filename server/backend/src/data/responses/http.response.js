class HttpResponse {
    constructor(code, message, data = null) {
        this.Code = code;
        this.Message = message;
        this.Data = data;
    }

    static success(message, data = null) {
        return new HttpResponse(1, message, data);
    }

    static error(message, code = -1, data = null) {
        return new HttpResponse(code, message, data);
    }
}

module.exports = HttpResponse;
