const { getSession } = require('../configs/neo4j.config');
const { cosineSimilarity } = require('../utils/calculator.util');

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

    // Tìm kiếm node theo label va field
    async searchNodeByLabelAndField(label, field, keyword) {
        const session = getSession();
        try {
            const result = await session.run(`
                MATCH (n:${label})
                WHERE toLower(n.${field}) CONTAINS toLower($keyword)
                RETURN n
            `, { keyword });
            return result.records.map(r => r.get('n').properties);
        } finally {
            await session.close();
        }
    }

    /**
     * Tìm các node gần nhất trong nhiều label khác nhau dựa trên vector embedding.
     * Nếu nhiều label có node liên quan giống nhau, sẽ lọc các node liên quan chung và sắp xếp theo similarity.
     *
     * @param {Array} pairs - Mỗi phần tử gồm:
     *   - label: tên node (Group, Major, Programme,...)
     *   - vector: embedding vector để so sánh
     * @param {number} topK - Số node gần nhất muốn lấy mỗi label
     * @returns {Object} Trả về:
     *   - mainNodes: các node chính tìm được
     *   - relatedCommon: các node liên quan chung nhiều label
     */
    async findMultipleVectorSimilarities(pairs = [], topK = 5) {
        const session = getSession();
        try {
            let mainNodes = [];
            const relatedSet = new Map();

            for (const { label, vector } of pairs) {
                const scoredNodes = await this.getScoredNodes(session, label, vector, topK);

                for (const item of scoredNodes) {
                    const { embedding, ...mainNode } = item.node;
                    mainNodes.push({
                        ...mainNode,
                        similarity: item.score,
                        label
                    });

                    const related = await this.getRelatedNodes(session, label, mainNode.id);
                    for (const r of related) {
                        if (!relatedSet.has(r.id)) {
                            relatedSet.set(r.id, r);
                        }
                    }
                }
            }

            mainNodes.sort((a, b) => b.similarity - a.similarity);
            const relatedAll = Array.from(relatedSet.values()).slice(0, 3);

            return { mainNodes, relatedAll };
        } finally {
            await session.close();
        }
    }

    async getScoredNodes(session, label, vector, topK) {
        const result = await session.run(`
            MATCH (n:${label}) WHERE n.embedding IS NOT NULL RETURN n
        `);

        const nodes = result.records.map(r => {
            const node = r.get('n');
            return {
                ...node.properties,
                __label: label,
                __identity: node.identity.toInt(),
                __labels: node.labels
            };
        });

        return nodes
            .map(n => ({ node: n, score: cosineSimilarity(vector, n.embedding) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    async getRelatedNodes(session, label, nodeId) {
        // const relatedQuery = this.getTraversalQuery(label);
        // if (!relatedQuery) return [];

        // const relatedResult = await session.run(relatedQuery, { nodeId });
        // return relatedResult.records[0]?.get('relatedNodes')?.map(rel => {
        //     const { embedding, ...rest } = rel.properties;
        //     return {
        //         ...rest,
        //         __label: rel.labels?.[0],
        //         __identity: rel.identity?.toInt()
        //     };
        // }) || [];
        return await this.traverseGeneric(session, nodeId, 1);
    }

    getTraversalQuery(label) {
        switch (label) {
            case 'Major':
                return `MATCH (n:Major {id: $nodeId})-[:HAS_PROGRAMME]->(:Programme)-[:IS_INSTANCE_OF]->(mp:MajorProgramme) RETURN collect(DISTINCT mp) AS relatedNodes`;
            case 'Programme':
                return `MATCH (n:Programme {id: $nodeId})-[:IS_INSTANCE_OF]->(mp:MajorProgramme) RETURN collect(DISTINCT mp) AS relatedNodes`;
            case 'Group':
                return `MATCH (n:Group {id: $nodeId})-[:HAS_MAJOR]->(m:Major) RETURN collect(DISTINCT m) AS relatedNodes`;
            case 'MajorProgramme':
                return `MATCH (mp:MajorProgramme {id: $nodeId})<-[:IS_INSTANCE_OF]-(:Programme)<-[:HAS_PROGRAMME]-(m:Major) RETURN collect(DISTINCT m) AS relatedNodes`;
            default:
                return null;
        }
    }

    /**
     * Truy vấn các node liên kết với một node bất kỳ theo chiều tự do và độ sâu mong muốn.
     *
     * @param {Object} session - Neo4j session đang sử dụng.
     * @param {string} nodeId - ID của node gốc muốn truy vấn.
     * @param {number} depth - Độ sâu tối đa của traversal (mặc định = 2).
     * @returns {Array} Danh sách các node liên kết (loại bỏ embedding).
     */
    async traverseGeneric(session, nodeId, targetLabel = '', depth = 2) {
        const result = await session.run(`
            MATCH (startNode {id: $nodeId})-[:HAS_MAJOR|HAS_PROGRAMME|IS_INSTANCE_OF*1..${depth}]->(related)
            WHERE related.id IS NOT NULL
            RETURN collect(DISTINCT related) AS relatedNodes
        `, { nodeId });
    
        return result.records[0]?.get('relatedNodes')?.map(node => {
            const { embedding, ...props } = node.properties;
            return {
                ...props,
                __label: node.labels?.[0],
                __identity: node.identity.toInt()
            };
        }) || [];
    }        

    //#endregion
}

module.exports = new Neo4jService();