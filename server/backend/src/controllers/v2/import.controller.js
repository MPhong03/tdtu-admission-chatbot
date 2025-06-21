const N_DataService = require('../../services/v2/import.neo4j-service');
const HttpResponse = require('../../data/responses/http.response');
const logger = require('../../utils/logger.util');

class ImportController {
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
}

module.exports = new ImportController();