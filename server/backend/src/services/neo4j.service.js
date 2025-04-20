const { getSession } = require('../configs/neo4j.config');

class Neo4jService {
    // Tìm kiếm ngành theo nhóm ngành
    async findMajorsByGroup(groupId) {
        const session = getSession();
        try {
            const result = await session.run(`
                MATCH (g:Group {id: $groupId})-[:HAS_MAJOR]->(m:Major)
                RETURN m
            `, { groupId });
            return result.records.map(r => r.get('m').properties);
        } finally {
            await session.close();
        }
    }

    // Tìm kiếm hệ đào tạo theo ngành
    async findProgrammesByMajor(majorId) {
        const session = getSession();
        try {
            const result = await session.run(`
                MATCH (m:Major {id: $majorId})-[:HAS_PROGRAMME]->(p:Programme)
                RETURN p
            `, { majorId });
            return result.records.map(r => r.get('p').properties);
        } finally {
            await session.close();
        }
    }

    // Tìm kiếm ngành hệ theo hệ đào tạo
    async findMajorProgrammeByProgramme(programmeId) {
        const session = getSession();
        try {
            const result = await session.run(`
                MATCH (p:Programme {id: $programmeId})-[:IS_INSTANCE_OF]->(mp:MajorProgramme)
                RETURN mp
            `, { programmeId });
            return result.records.map(r => r.get('mp').properties);
        } finally {
            await session.close();
        }
    }

    // Tìm kiếm chuỗi từ hệ đào tạo
    async fullPathFromProgramme(programmeId) {
        const session = getSession();
        try {
            const result = await session.run(`
                MATCH (g:Group)-[:HAS_MAJOR]->(m:Major)-[:HAS_PROGRAMME]->(p:Programme {id: $programmeId})
                RETURN g, m, p
            `, { programmeId });

            const [g, m, p] = result.records[0].map(r => r.properties);
            return { group: g, major: m, programme: p };
        } finally {
            await session.close();
        }
    }

    // Tìm kiếm chuỗi từ ngành hệ
    async fullPathFromMajorProgramme(mpId) {
        const session = getSession();
        try {
            const result = await session.run(`
                MATCH (g:Group)-[:HAS_MAJOR]->(m:Major)-[:HAS_PROGRAMME]->(p:Programme)-[:IS_INSTANCE_OF]->(mp:MajorProgramme {id: $mpId})
                RETURN g, m, p, mp
            `, { mpId });

            const [g, m, p, mp] = result.records[0].map(r => r.properties);
            return { group: g, major: m, programme: p, majorProgramme: mp };
        } finally {
            await session.close();
        }
    }

    // Kết nói ngành với nhóm ngành
    async linkGroupToMajor(groupId, majorId) {
        const session = getSession();
        try {
            await session.run(`
                MATCH (g:Group {id: $groupId}), (m:Major {id: $majorId})
                MERGE (g)-[:HAS_MAJOR]->(m)
            `, { groupId, majorId });
        } finally {
            await session.close();
        }
    }
    
    // Kết nói ngành với hệ đào tạo
    async linkMajorToProgramme(majorId, programmeId) {
        const session = getSession();
        try {
            await session.run(`
                MATCH (m:Major {id: $majorId}), (p:Programme {id: $programmeId})
                MERGE (m)-[:HAS_PROGRAMME]->(p)
            `, { majorId, programmeId });
        } finally {
            await session.close();
        }
    }
    
    // Kết nói hệ đào tạo với ngành hệ
    async linkProgrammeToMajorProgramme(programmeId, majorProgrammeId) {
        const session = getSession();
        try {
            await session.run(`
                MATCH (p:Programme {id: $programmeId}), (mp:MajorProgramme {id: $majorProgrammeId})
                MERGE (p)-[:IS_INSTANCE_OF]->(mp)
            `, { programmeId, majorProgrammeId });
        } finally {
            await session.close();
        }
    }    
}

module.exports = new Neo4jService();