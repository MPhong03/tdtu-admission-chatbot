const N_DataService = require('../../services/v2/import.neo4j-service');
const ExcelService = require('../../services/v2/excel.service');
const HttpResponse = require('../../data/responses/http.response');
const logger = require('../../utils/logger.util');

class ImportController {
    // ================================= IMPORT JSON =================================
    /**
     * Import majors, programmes, major_programmes, years
     * Body: { majors, programmes, major_programmes, years }
     */
    async importMajorsProgrammesAndYears(req, res) {
        try {
            const { majors, programmes, major_programmes, years } = req.body;
            await N_DataService.importMajorsProgrammesAndYears({ majors, programmes, major_programmes, years });
            return res.json(HttpResponse.success('Import majors/programmes/major_programmes/years thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    /**
     * Import chỉ programmes
     * Body: { programmes }
     */
    async importProgrammes(req, res) {
        try {
            const { programmes } = req.body;
            await N_DataService.importProgrammes({ programmes });
            return res.json(HttpResponse.success('Import programmes thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    /**
     * Import chỉ years
     * Body: { years }
     */
    async importYears(req, res) {
        try {
            const { years } = req.body;
            await N_DataService.importYears({ years });
            return res.json(HttpResponse.success('Import years thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    /**
     * Import tuitions, programmes, years
     * Body: { tuitions, programmes, years }
     */
    async importTuitions(req, res) {
        try {
            const { tuitions, programmes, years } = req.body;
            await N_DataService.importTuitions({ tuitions, programmes, years });
            return res.json(HttpResponse.success('Import tuitions/programmes/years thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    /**
     * Import scholarships, years
     * Body: { scholarships, years }
     */
    async importScholarships(req, res) {
        try {
            const { scholarships, years } = req.body;
            await N_DataService.importScholarships({ scholarships, years });
            return res.json(HttpResponse.success('Import scholarships/years thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    /**
     * Import documents, years
     * Body: { documents, years }
     */
    async importDocuments(req, res) {
        try {
            const { documents, years } = req.body;
            await N_DataService.importDocuments({ documents, years });
            return res.json(HttpResponse.success('Import documents/years thành công'));
        } catch (err) {
            logger.error('Error:', err);
            return res.status(500).json(HttpResponse.error('Lỗi hệ thống'));
        }
    }

    // ================================= IMPORT & EXPORT EXCEL =================================
    /**
   * Import chi tiết ngành học từ file Excel
   */
    async importMajorProgrammes(req, res) {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json(HttpResponse.error("Vui lòng upload file Excel."));
            }
            const result = await ExcelService.importMajorProgrammes(file.path);
            return res.json(HttpResponse.success("Import MajorProgramme thành công", result));
        } catch (error) {
            console.error("[ImportMajorProgrammes]", error);
            return res.status(500).json(HttpResponse.error("Đã xảy ra lỗi khi import MajorProgramme."));
        }
    }

    /**
     * Export dữ liệu chi tiết ngành học ra file Excel
     */
    async exportMajorProgrammes(req, res) {
        try {
            const filePath = await ExcelService.exportMajorProgrammes();
            return res.download(filePath);
        } catch (error) {
            console.error("[ExportMajorProgrammes]", error);
            return res.status(500).json(HttpResponse.error("Đã xảy ra lỗi khi export MajorProgramme."));
        }
    }

    /**
     * Import các label khác từ file Excel
     */
    async importGeneric(req, res) {
        try {
            const file = req.file;
            const { label } = req.params;
            if (!file || !label) {
                return res.status(400).json(HttpResponse.error("Vui lòng cung cấp label và file."));
            }
            const result = await ExcelService.importGeneric(label, file.path);
            return res.json(HttpResponse.success(`Import ${label} thành công`, result));
        } catch (error) {
            console.error(`[Import ${req.params.label}]`, error);
            return res.status(500).json(HttpResponse.error(`Đã xảy ra lỗi khi import ${req.params.label}`));
        }
    }

    /**
     * Export dữ liệu các label khác ra file Excel
     */
    async exportGeneric(req, res) {
        try {
            const { label } = req.params;
            if (!label) return res.status(400).json(HttpResponse.error("Thiếu label"));

            const filePath = await ExcelService.exportGeneric(label);
            return res.download(filePath);
        } catch (error) {
            console.error(`[Export ${req.params.label}]`, error);
            return res.status(500).json(HttpResponse.error(`Đã xảy ra lỗi khi export ${req.params.label}`));
        }
    }
}

module.exports = new ImportController();