const { getSession } = require('../configs/neo4j.config');
const { cosineSimilarity } = require('../utils/calculator.util');
const LLMService = require('./llm.service');

class Neo4jService {
    // Hàm get node theo label và id
    async getById(label, id) {
        const session = getSession();
        try {
            const result = await session.run(
                `
                MATCH (n:${label} {id: $id})
                RETURN n
                `,
                { id }
            );

            const record = result.records[0];
            if (record) {
                const node = record.get('n');
                return node.properties;
            }
            return null;
        } finally {
            await session.close();
        }
    }
    
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

    async linkNodes(startId, startLabel, relType, endId, endLabel, relProps = {}) {
        const session = getSession();
        try {
            await session.run(
                `
                MATCH (a:${startLabel} {id: $startId})
                MATCH (b:${endLabel} {id: $endId})
                MERGE (a)-[r:${relType}]->(b)
                SET r += $relProps
                RETURN r
                `,
                { startId, endId, relProps }
            );
        } finally {
            await session.close();
        }
    }

    async linkGroupToMajor(groupId, majorId) {
        const description = 'Group chứa Major';
        const embedding = await LLMService.getEmbedding(description);
        return await this.linkNodes(groupId, 'Group', 'HAS_MAJOR', majorId, 'Major', {
            description,
            embedding
        });
    }

    async linkMajorToProgramme(majorId, programmeId) {
        const description = 'Major đào tạo Programme';
        const embedding = await LLMService.getEmbedding(description);
        return await this.linkNodes(majorId, 'Major', 'HAS_PROGRAMME', programmeId, 'Programme', {
            description,
            embedding
        });
    }

    async linkProgrammeToMajorProgramme(programmeId, majorProgrammeId) {
        const description = 'Programme chi tiết bởi MajorProgramme';
        const embedding = await LLMService.getEmbedding(description);
        return await this.linkNodes(programmeId, 'Programme', 'IS_INSTANCE_OF', majorProgrammeId, 'MajorProgramme', {
            description,
            embedding
        });
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
            let allRelatedNodes = [];

            // Step 1: Tìm tất cả các main nodes cho mỗi label trong pairs
            for (const { label, vector } of pairs) {
                const scoredNodes = await this.getScoredNodes(session, label, vector, topK);

                for (const item of scoredNodes) {
                    const { embedding, ...mainNode } = item.node;
                    mainNodes.push({
                        ...mainNode,
                        similarity: item.score,
                        label
                    });

                    // Tìm các related nodes cho mỗi main node
                    const relatedNodes = await this.getRelatedNodes(session, label, mainNode.id);
                    allRelatedNodes.push(relatedNodes);
                }
            }

            // Step 2: Lấy các node chung trong tất cả các relatedNodes
            const commonRelatedNodes = this.getCommonRelatedNodes(allRelatedNodes);

            // Step 3: Sắp xếp mainNodes và relatedNodes
            mainNodes.sort((a, b) => b.similarity - a.similarity);
            commonRelatedNodes.sort((a, b) => b.similarity - a.similarity);

            return { mainNodes, relatedCommon: commonRelatedNodes };
        } finally {
            await session.close();
        }
    }

    /**
     * Lấy các node đã được tính điểm similarity dựa trên vector embedding
     */
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

    /**
     * Lấy các related nodes cho một main node từ cơ sở dữ liệu Neo4j
     */
    async getRelatedNodes(session, label, nodeId) {
        const relatedQuery = this.getTraversalQuery(label);
        if (!relatedQuery) return [];

        const relatedResult = await session.run(relatedQuery, { nodeId });
        return relatedResult.records[0]?.get('relatedNodes')?.map(rel => {
            const { embedding, ...rest } = rel.properties;
            return {
                ...rest,
                __label: rel.labels?.[0],
                __identity: rel.identity?.toInt()
            };
        }) || [];
    }

    /**
     * Truy vấn các node liên kết với một node dựa trên mối quan hệ trong cơ sở dữ liệu Neo4j
     */
    getTraversalQuery(label) {
        switch (label) {
            case 'Major':
                return `MATCH (m:Major {id: $nodeId})-[:HAS_PROGRAMME]->(p:Programme)-[:IS_INSTANCE_OF]->(mp:MajorProgramme)
                        WHERE mp.name = m.name AND mp.tab = p.name
                        RETURN collect(DISTINCT mp) AS relatedNodes`;
    
            case 'Programme':
                return `MATCH (p:Programme {id: $nodeId})-[:IS_INSTANCE_OF]->(mp:MajorProgramme)
                        RETURN collect(DISTINCT mp) AS relatedNodes`;
    
            // Các label khác
            case 'Group':
                return `MATCH (g:Group {id: $nodeId})-[:HAS_MAJOR]->(m:Major)
                        RETURN collect(DISTINCT m) AS relatedNodes`;
                
            case 'MajorProgramme':
                return `MATCH (mp:MajorProgramme {id: $nodeId})<-[:IS_INSTANCE_OF]-(p:Programme)<-[:HAS_PROGRAMME]-(m:Major)
                        RETURN collect(DISTINCT m) AS relatedNodes`;
    
            default:
                return null;
        }
    }

    /**
     * Tìm các related nodes chung cho tất cả các danh sách related nodes
     * Chỉ lấy các node có trong tất cả các danh sách related nodes.
     */
    getCommonRelatedNodes(allRelatedNodes) {
        // Nếu không có related nodes, trả về mảng rỗng
        if (allRelatedNodes.length === 0) return [];

        // Lấy liên kết chung giữa các danh sách related nodes
        let commonRelated = allRelatedNodes[0]; // Lấy danh sách đầu tiên
        for (let i = 1; i < allRelatedNodes.length; i++) {
            commonRelated = commonRelated.filter(node =>
                allRelatedNodes[i].some(relatedNode => relatedNode.id === node.id)
            );
        }

        return commonRelated;
    }
}

module.exports = new Neo4jService();