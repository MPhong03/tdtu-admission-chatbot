const BaseService = require('./common/base.neo4j-service');
const edgeRepo = require('../../repositories/v2/common/neo4j-edge.repository');
const neo4jRepo = require('../../repositories/v2/common/neo4j.repository');

/**
 * Major Service
 */
class N_MajorService extends BaseService {
    constructor() { super('Major'); }

    // (Major)-[:HAS_PROGRAMME]->(Programme)
    async linkToProgramme(majorId, programmeId, relProps = {}) {
        return edgeRepo.upsert('Major', majorId, 'HAS_PROGRAMME', 'Programme', programmeId, relProps);
    }

    async getDetail(majorId) {
        // 1. Lấy Major
        const majorCypher = `MATCH (m:Major {id: $majorId}) RETURN m`;
        const major = await neo4jRepo.executeOne(majorCypher, { majorId });
        if (!major) return null;

        // 2. Lấy danh sách MajorProgramme kèm Programme và Year
        const majorProgrammesCypher = `
            MATCH (m:Major {id: $majorId})<-[:OF_MAJOR]-(mp:MajorProgramme)
            OPTIONAL MATCH (mp)-[:OF_PROGRAMME]->(p:Programme)
            OPTIONAL MATCH (mp)-[:OF_YEAR]->(y:Year)
            RETURN mp, p, y
        `;
        const mpResult = await neo4jRepo.execute(majorProgrammesCypher, { majorId }, { raw: true });

        // 3. Gom nhóm MajorProgramme (theo id), mảng các years/programmes trong từng MajorProgramme
        const mpMap = new Map();
        mpResult.forEach(r => {
            const mpId = r.mp.properties.id;
            if (!mpMap.has(mpId)) {
                mpMap.set(mpId, {
                    ...r.mp.properties,
                    years: [],
                    programmes: []
                });
            }
            const mp = mpMap.get(mpId);
            // Thêm year nếu chưa có
            if (r.y && r.y.properties && !mp.years.some(y => y.id === r.y.properties.id)) {
                mp.years.push(r.y.properties);
            }
            // Thêm programme nếu chưa có
            if (r.p && r.p.properties && !mp.programmes.some(p => p.id === r.p.properties.id)) {
                mp.programmes.push(r.p.properties);
            }
        });
        const majorProgrammes = Array.from(mpMap.values());

        // 4. Lấy danh sách year duy nhất
        const yearMap = new Map();
        majorProgrammes.forEach(mp => {
            mp.years.forEach(y => {
                if (y && !yearMap.has(y.id)) {
                    yearMap.set(y.id, y);
                }
            });
        });
        const years = Array.from(yearMap.values());

        // 5. Lấy danh sách programme duy nhất
        const progMap = new Map();
        majorProgrammes.forEach(mp => {
            mp.programmes.forEach(p => {
                if (p && !progMap.has(p.id)) {
                    progMap.set(p.id, p);
                }
            });
        });
        const programmes = Array.from(progMap.values());

        // 6. Trả về object chi tiết
        return {
            ...major,
            majorProgrammes,
            years,
            programmes
        };
    }
}

/**
 * Programme Service
 */
class N_ProgrammeService extends BaseService {
    constructor() { super('Programme'); }

    // (Programme)-[:HAS_MAJOR]->(Major)
    async linkToMajor(programmeId, majorId, relProps = {}) {
        return edgeRepo.upsert('Programme', programmeId, 'HAS_MAJOR', 'Major', majorId, relProps);
    }

    // (Programme)-[:HAS_TUITION]->(Tuition)
    async linkToTuition(programmeId, tuitionId, relProps = {}) {
        return edgeRepo.upsert('Programme', programmeId, 'HAS_TUITION', 'Tuition', tuitionId, relProps);
    }

    async getDetail(programmeId) {
        const cypher = `MATCH (p:Programme {id: $programmeId}) RETURN p`;
        const programme = await neo4jRepo.executeOne(cypher, { programmeId });
        return programme;
    }
}

/**
 * MajorProgramme Service
 */
class N_MajorProgrammeService extends BaseService {
    constructor() { super('MajorProgramme'); }

    // (MajorProgramme)-[:OF_MAJOR]->(Major)
    async linkToMajor(mpId, majorId, relProps = {}) {
        return edgeRepo.upsert('MajorProgramme', mpId, 'OF_MAJOR', 'Major', majorId, relProps);
    }

    // (MajorProgramme)-[:OF_PROGRAMME]->(Programme)
    async linkToProgramme(mpId, programmeId, relProps = {}) {
        return edgeRepo.upsert('MajorProgramme', mpId, 'OF_PROGRAMME', 'Programme', programmeId, relProps);
    }

    // (MajorProgramme)-[:OF_YEAR]->(Year)
    async linkToYear(mpId, yearId, relProps = {}) {
        return edgeRepo.upsert('MajorProgramme', mpId, 'OF_YEAR', 'Year', yearId, relProps);
    }

    /**
     * Lấy tất cả MajorProgramme theo majorId, chỉ trả về majorprogrammes
     */
    async findByMajorId(majorId) {
        const cypher = `
            MATCH (mp:MajorProgramme)-[:OF_MAJOR]->(m:Major {id: $majorId})
            RETURN mp
        `;
        const results = await neo4jRepo.execute(cypher, { majorId }, { raw: true });

        return results.map(r => r.mp.properties);
    }
}

/**
 * Year Service
 */
class N_YearService extends BaseService {
    constructor() { super('Year'); }

    // (Year)-[:HAS_DOCUMENT]->(Document)
    async linkToDocument(yearId, docId, relProps = {}) {
        return edgeRepo.upsert('Year', yearId, 'HAS_DOCUMENT', 'Document', docId, relProps);
    }

    // (Year)-[:HAS_TUITION]->(Tuition)
    async linkToTuition(yearId, tuitionId, relProps = {}) {
        return edgeRepo.upsert('Year', yearId, 'HAS_TUITION', 'Tuition', tuitionId, relProps);
    }

    // (Year)-[:HAS_MAJORPROGRAMME]->(MajorProgramme)
    async linkToMajorProgramme(yearId, mpId, relProps = {}) {
        return edgeRepo.upsert('Year', yearId, 'HAS_MAJORPROGRAMME', 'MajorProgramme', mpId, relProps);
    }

    async getDetail(yearId) {
        const cypher = `MATCH (y:Year {id: $yearId}) RETURN y`;
        return await neo4jRepo.executeOne(cypher, { yearId });
    }
}

/**
 * Tuition Service
 */
class N_TuitionService extends BaseService {
    constructor() { super('Tuition'); }

    // (Tuition)-[:OF_PROGRAMME]->(Programme)
    async linkToProgramme(tuitionId, programmeId, relProps = {}) {
        return edgeRepo.upsert('Tuition', tuitionId, 'OF_PROGRAMME', 'Programme', programmeId, relProps);
    }

    // (Tuition)-[:OF_YEAR]->(Year)
    async linkToYear(tuitionId, yearId, relProps = {}) {
        return edgeRepo.upsert('Tuition', tuitionId, 'OF_YEAR', 'Year', yearId, relProps);
    }

    async getDetail(tuitionId) {
        const cypher = `
            MATCH (t:Tuition {id: $tuitionId})
            OPTIONAL MATCH (t)-[:OF_YEAR]->(y:Year)
            OPTIONAL MATCH (t)-[:OF_PROGRAMME]->(p:Programme)
            RETURN t, y, p
        `;
        const result = await neo4jRepo.executeOne(cypher, { tuitionId }, { raw: true });
        if (!result) return null;
        return {
            ...result.t.properties,
            year: result.y ? result.y.properties : null,
            programme: result.p ? result.p.properties : null
        };
    }
}

/**
 * Scholarship Service
 */
class N_ScholarshipService extends BaseService {
    constructor() { super('Scholarship'); }

    // (Scholarship)-[:OF_YEAR]->(Year)
    async linkToYear(scholarshipId, yearId, relProps = {}) {
        return edgeRepo.upsert('Scholarship', scholarshipId, 'OF_YEAR', 'Year', yearId, relProps);
    }

    async getDetail(scholarshipId) {
        const cypher = `
            MATCH (s:Scholarship {id: $scholarshipId})
            OPTIONAL MATCH (s)-[:OF_YEAR]->(y:Year)
            RETURN s, y
        `;
        const result = await neo4jRepo.executeOne(cypher, { scholarshipId }, { raw: true });
        if (!result) return null;
        return {
            ...result.s.properties,
            year: result.y ? result.y.properties : null
        };
    }
}

/**
 * Document Service
 */
class N_DocumentService extends BaseService {
    constructor() { super('Document'); }

    // Document không có quan hệ chủ động, chỉ nhận từ Year
    async getDetail(documentId) {
        const cypher = `
            MATCH (d:Document {id: $documentId})
            OPTIONAL MATCH (y:Year)-[:HAS_DOCUMENT]->(d)
            RETURN d, y
        `;
        const result = await neo4jRepo.executeOne(cypher, { documentId }, { raw: true });
        if (!result) return null;
        return {
            ...result.d.properties,
            year: result.y ? result.y.properties : null
        };
    }
}

// Export instance để import dùng trực tiếp
module.exports = {
    N_MajorService: new N_MajorService(),
    N_ProgrammeService: new N_ProgrammeService(),
    N_MajorProgrammeService: new N_MajorProgrammeService(),
    N_YearService: new N_YearService(),
    N_TuitionService: new N_TuitionService(),
    N_ScholarshipService: new N_ScholarshipService(),
    N_DocumentService: new N_DocumentService()
};