const {
    N_MajorService,
    N_ProgrammeService,
    N_MajorProgrammeService
} = require('../../services/v2/nodes.neo4j-service');
const HttpResponse = require('../../data/responses/http.response');
const logger = require('../../utils/logger.util');

class MajorController {
    /**
     * Tạo ngành học, liên kết group, programmes, majorProgrammes
     * Body: { major, group, programmes, majorProgrammes }
     */
    async create(req, res) {
        try {
            const { major, group, programmes, majorProgrammes } = req.body;
            await N_MajorService.create(major);
            if (group?.id && N_MajorService.linkToGroup) {
                await N_MajorService.linkToGroup(major.id, group.id);
            }
            for (const prog of programmes || []) {
                await N_MajorService.linkToProgramme(major.id, prog.id);
                await N_ProgrammeService.linkToMajor(prog.id, major.id);
            }
            for (const mp of majorProgrammes || []) {
                await N_MajorProgrammeService.create(mp);
                await N_MajorProgrammeService.linkToMajor(mp.id, major.id);
                await N_MajorProgrammeService.linkToProgramme(mp.id, mp.programmeId);
                if (Array.isArray(mp.yearIds)) {
                    for (const yid of mp.yearIds) {
                        await N_MajorProgrammeService.linkToYear(mp.id, yid);
                    }
                }
            }
            return res.json(HttpResponse.success('Tạo ngành học thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    /**
     * Cập nhật ngành học và các liên kết
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const { major, group, programmes, majorProgrammes } = req.body;
            await N_MajorService.update(id, major);
            if (group?.id && N_MajorService.linkToGroup) {
                await N_MajorService.linkToGroup(id, group.id);
            }
            for (const prog of programmes || []) {
                await N_MajorService.linkToProgramme(id, prog.id);
                await N_ProgrammeService.linkToMajor(prog.id, id);
            }
            for (const mp of majorProgrammes || []) {
                await N_MajorProgrammeService.create(mp);
                await N_MajorProgrammeService.linkToMajor(mp.id, id);
                await N_MajorProgrammeService.linkToProgramme(mp.id, mp.programmeId);
                if (mp.yearId)
                    await N_MajorProgrammeService.linkToYear(mp.id, mp.yearId);
            }
            return res.json(HttpResponse.success('Cập nhật ngành học thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    /**
     * Xóa ngành học và MajorProgramme liên quan
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            if (N_MajorProgrammeService.findByMajorId) {
                const mps = await N_MajorProgrammeService.findByMajorId(id);
                for (const mp of mps) {
                    await N_MajorProgrammeService.delete(mp.id);
                }
            }
            await N_MajorService.delete(id);
            return res.json(HttpResponse.success('Xóa ngành học thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    async getDetail(req, res) {
        try {
            const { id } = req.params;
            const detail = await N_MajorService.getDetail(id);
            if (!detail) {
                return res.status(404).json(HttpResponse.error('Không tìm thấy ngành học'));
            }
            // Parse images nếu là chuỗi JSON
            if (detail.images && typeof detail.images === 'string') {
                try {
                    detail.images = JSON.parse(detail.images);
                } catch (e) {
                    detail.images = []; // Hoặc null nếu parse lỗi
                }
            }
            return res.json(HttpResponse.success('Lấy chi tiết ngành học thành công', detail));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    /**
     * Lấy danh sách ngành học (phân trang)
     * Query: page, pageSize
     */
    async list(req, res) {
        try {
            const { page = 1, pageSize = 10 } = req.query;
            const data = await N_MajorService.paginate({ page: +page, pageSize: +pageSize });
            return res.json(HttpResponse.success('Lấy danh sách ngành học thành công', data));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }
}

module.exports = new MajorController();