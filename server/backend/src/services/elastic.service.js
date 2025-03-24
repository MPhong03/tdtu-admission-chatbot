const fs = require("fs");
const path = require("path");
const ElasticRepository = require("../repositories/elastic.repository");
const HttpResponse = require("../data/responses/http.response");

class ElasticService {
    constructor() {
        // Cache templates vào bộ nhớ để tránh đọc file nhiều lần
        this.templatesPath = path.join(__dirname, "../data/templates.json");
        this.templates = this.loadTemplates();
    }

    // Load templates từ file JSON
    loadTemplates() {
        try {
            return JSON.parse(fs.readFileSync(this.templatesPath, "utf-8"));
        } catch (error) {
            console.error("Lỗi khi tải templates:", error);
            return {};
        }
    }

    // Lấy danh sách các loại dữ liệu có thể index
    getAvailableTemplates() {
        return Object.keys(this.templates);
    }

    // Lấy index tương ứng từ templates.json
    getIndexByType(type) {
        return this.templates[type]?.index || null;
    }

    // Kiểm tra index tồn tại, nếu chưa thì tạo mới
    async ensureIndexExists(type) {
        const indexName = this.getIndexByType(type);
        if (!indexName) return HttpResponse.error(`Không tìm thấy index cho loại '${type}'.`);

        const exists = await ElasticRepository.checkIndexExists(indexName);
        if (!exists) {
            return await this.createIndex(type);
        }
        return HttpResponse.success(`Index '${indexName}' đã tồn tại.`);
    }

    // Tạo index theo template
    async createIndex(type) {
        try {
            const templateInfo = this.templates[type];
            if (!templateInfo) {
                return HttpResponse.error(`Template '${type}' không tồn tại.`);
            }

            const templatePath = path.join(__dirname, "../data", templateInfo.template);
            if (!fs.existsSync(templatePath)) {
                return HttpResponse.error(`File template '${templateInfo.template}' không tồn tại.`);
            }

            const template = JSON.parse(fs.readFileSync(templatePath, "utf-8"));

            // Tạo Index Template trước
            await ElasticRepository.createIndexTemplate(templateInfo.index, template);

            // Sau đó tạo Index thực tế
            const success = await ElasticRepository.createIndex(templateInfo.index);
            return success
                ? HttpResponse.success(`Index '${templateInfo.index}' đã được tạo thành công.`)
                : HttpResponse.error(`Index '${templateInfo.index}' đã tồn tại.`);
        } catch (error) {
            return HttpResponse.error(`Lỗi khi tạo index '${type}': ${error.message}`);
        }
    }  

    // Xóa index theo loại dữ liệu
    async deleteIndex(type) {
        try {
            const indexName = this.getIndexByType(type);
            if (!indexName) return HttpResponse.error(`Không tìm thấy index cho loại '${type}'.`);

            const success = await ElasticRepository.deleteIndex(indexName);
            return success
                ? HttpResponse.success(`Index '${indexName}' đã được xóa.`)
                : HttpResponse.error(`Index '${indexName}' không tồn tại.`);
        } catch (error) {
            return HttpResponse.error(`Lỗi khi xóa index '${type}': ${error.message}`);
        }
    }

    // Thêm dữ liệu vào index (tự động tạo index nếu chưa tồn tại)
    async addData(type, data) {
        try {
            const indexName = this.getIndexByType(type);
            if (!indexName) return HttpResponse.error(`Không tìm thấy index cho loại '${type}'.`);

            await this.ensureIndexExists(type);
            await ElasticRepository.addData(indexName, data);
            return HttpResponse.success(`Dữ liệu đã được thêm vào '${indexName}' thành công.`);
        } catch (error) {
            return HttpResponse.error(`Lỗi khi thêm dữ liệu vào '${type}': ${error.message}`);
        }
    }

    // Cập nhật dữ liệu trong index (cập nhật theo ID)
    async updateData(type, id, newData) {
        try {
            const indexName = this.getIndexByType(type);
            if (!indexName) return HttpResponse.error(`Không tìm thấy index cho loại '${type}'.`);

            await this.ensureIndexExists(type);
            const success = await ElasticRepository.updateData(indexName, id, newData);
            return success
                ? HttpResponse.success(`Dữ liệu trong '${indexName}' đã được cập nhật.`)
                : HttpResponse.error(`Không tìm thấy dữ liệu có ID '${id}' trong '${indexName}'.`);
        } catch (error) {
            return HttpResponse.error(`Lỗi khi cập nhật dữ liệu trong '${type}': ${error.message}`);
        }
    }

    // Tìm kiếm dữ liệu trong index
    async search(type, query, fields = ["*"], from = 0, size = 10) {
        try {
            const indexName = this.getIndexByType(type);
            if (!indexName) return HttpResponse.error(`Không tìm thấy index cho loại '${type}'.`);

            const results = await ElasticRepository.search(indexName, query, fields, from, size);
            return HttpResponse.success("Kết quả tìm kiếm:", results);
        } catch (error) {
            return HttpResponse.error(`Lỗi khi tìm kiếm trong '${type}': ${error.message}`);
        }
    }

    async getAllData(type) {
        try {
            const indexName = this.getIndexByType(type);
            if (!indexName) return HttpResponse.error(`Không tìm thấy index cho loại '${type}'.`);
    
            const data = await ElasticRepository.getAllData(indexName);
            return HttpResponse.success(`Dữ liệu từ '${indexName}':`, data);
        } catch (error) {
            return HttpResponse.error(error.message);
        }
    }    
}

module.exports = new ElasticService();
