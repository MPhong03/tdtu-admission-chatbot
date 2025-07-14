const {
    N_MajorService,
    N_ProgrammeService,
    N_MajorProgrammeService
} = require('../../services/v2/nodes.neo4j-service');
const HttpResponse = require('../../data/responses/http.response');
const logger = require('../../utils/logger.util');
const { stringToId } = require('../../utils/neo4j.util');

class MajorController {
    /**
     * Tạo ngành học, liên kết group, programmes, majorProgrammes
     * Body: { major, group, programmes, majorProgrammes }
     */
    async create(req, res) {
        try {
            const { major, programmes, majorProgrammes } = req.body;
            // Tạo ngành học
            let newM = await N_MajorService.create(major);

            // Liên kết các programme
            for (const prog of programmes || []) {
                await N_MajorService.linkToProgramme(newM.id, prog.id);
                await N_ProgrammeService.linkToMajor(prog.id, newM.id);
            }

            // Tạo các liên kết majorProgramme
            for (const mpRaw of majorProgrammes || []) {
                const { fields = [], ...mpRest } = mpRaw;
                const fieldsObj = Array.isArray(fields)
                    ? fields.reduce((acc, cur) => {
                        if (cur.key) acc[cur.key] = cur.value;
                        return acc;
                    }, {})
                    : {};
                const mp = { ...mpRest, ...fieldsObj };

                mp.id = stringToId((mp.name || mp.major_code)) + "_" + mp.programmeId;

                let newMP = await N_MajorProgrammeService.create(mp);
                await N_MajorProgrammeService.linkToMajor(newMP.id, newM.id);
                await N_MajorProgrammeService.linkToProgramme(newMP.id, mp.programmeId);
                if (Array.isArray(mp.years)) {
                    for (const yid of mp.years) {
                        await N_MajorProgrammeService.linkToYear(newMP.id, yid);
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
            const importantKeys = [
                "major_code", "name", "description", "programmeId", "id",
                "major_id", "tab", "createdAt", "updatedAt", "years"
            ];

            const {
                major,
                programmes,
                majorProgrammes,
                deletedMajorProgrammeIds = [],
            } = req.body;

            // 1. Cập nhật ngành chính
            await N_MajorService.update(id, major);

            // 2. Liên kết các programme
            for (const prog of programmes || []) {
                await N_MajorService.linkToProgramme(id, prog.id);
                await N_ProgrammeService.linkToMajor(prog.id, id);
            }

            // 3. Xóa các majorProgramme bị loại bỏ
            if (Array.isArray(deletedMajorProgrammeIds)) {
                for (const mpId of deletedMajorProgrammeIds) {
                    await N_MajorProgrammeService.delete(mpId);
                }
            }

            // 4. Tạo hoặc cập nhật majorProgrammes
            for (const mpRaw of majorProgrammes || []) {
                const { id: mpId, fields = [], ...mpRest } = mpRaw;

                // Chuyển fields từ array sang object
                const fieldsObj = Array.isArray(fields)
                    ? fields.reduce((acc, cur) => {
                        if (cur.key) acc[cur.key] = cur.value;
                        return acc;
                    }, {})
                    : {};

                // Lọc mpRest chỉ giữ các key quan trọng
                const filteredMpRest = Object.keys(mpRest).reduce((acc, key) => {
                    if (importantKeys.includes(key)) acc[key] = mpRest[key];
                    return acc;
                }, {});

                // Tạo object final gửi lên DB
                const mp = { ...filteredMpRest, ...fieldsObj };

                let majorProgrammeId = mpId;

                if (mpId) {
                    const currentNode = await N_MajorProgrammeService.getById(mpId);
                    const currentKeys = Object.keys(currentNode);
                    const newKeys = [
                        ...Object.keys(filteredMpRest),
                        ...Object.keys(fieldsObj)
                    ];
                    const fieldsToRemove = currentKeys.filter(k =>
                        !newKeys.includes(k) && !importantKeys.includes(k)
                    );

                    // Update với fieldsToRemove
                    await N_MajorProgrammeService.update(mpId, mp, fieldsToRemove);
                } else {
                    // Tạo mới nếu chưa có id
                    const created = await N_MajorProgrammeService.create(mp);
                    majorProgrammeId = created.id || created;
                }

                // Liên kết lại major <-> majorProgramme <-> programme
                await N_MajorProgrammeService.linkToMajor(majorProgrammeId, id);
                await N_MajorProgrammeService.linkToProgramme(majorProgrammeId, mp.programmeId);

                // Liên kết các năm
                if (Array.isArray(mp.years)) {
                    for (const yid of mp.years) {
                        await N_MajorProgrammeService.linkToYear(majorProgrammeId, yid);
                    }
                }
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
            const mps = await N_MajorProgrammeService.findByMajorId(id);
            if (mps.length > 0) {
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
            const { page = 1, size = 10, keyword } = req.query;
            const filter = {
                $or: [
                    { name: keyword },
                    { description: keyword },
                    { reasons: keyword },
                ]
            };
            const data = await N_MajorService.paginate({ page: +page, pageSize: +size, query: filter });
            return res.json(HttpResponse.success('Lấy danh sách ngành học thành công', data));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }
}

module.exports = new MajorController();