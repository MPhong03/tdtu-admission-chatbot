const Neo4jService = require('../chatbots/neo4j.service');
const LLMService = require('../chatbots/llm.service');
const { cosineSimilarity } = require('../../utils/calculator.util');
const intentQueryMap = require('../../data/configs/intent_query_map.json');

class RetrieverQueryBuilder {
    /**
     * Truy vấn Neo4j từ các thực thể được nhận diện
     */
    async retrieve(entities) {
        const result = [];
        const visited = new Set();

        for (const entity of entities) {
            const key = `${entity.label}-${entity.name}`;
            if (visited.has(key)) continue;
            visited.add(key);

            // Tìm node tương ứng trong Neo4j qua `name`
            const node = await Neo4jService.getByName(entity.label, entity.name);
            if (!node) {
                console.warn(`[RetrieverQueryBuilder] Không tìm thấy node ${entity.label} với tên: ${entity.name}`);
                continue;
            }

            node.entityType = entity.label; // gắn lại label để nhận dạng sau

            switch (entity.label) {
                case 'Group':
                    result.push(...await this.resolveGroup(node));
                    break;
                case 'Major':
                    result.push(...await this.resolveMajor(node));
                    break;
                case 'Programme':
                    result.push(...await this.resolveProgramme(node));
                    break;
                case 'MajorProgramme':
                    result.push(...await this.resolveMajorProgramme(node));
                    break;
                default:
                    console.warn(`[RetrieverQueryBuilder] Unhandled entity: ${entity.label}`);
            }
        }

        // Deduplicate kết quả
        const deduplicated = Object.values(
            result.reduce((acc, item) => {
                const key = `${item.label}-${item.id}`;
                if (!acc[key]) acc[key] = item;
                return acc;
            }, {})
        );

        return deduplicated;
    }

    async resolveGroup(entity) {
        const records = await Neo4jService.query(`
            MATCH (g:Group {id: $id})-[:HAS_MAJOR]->(m:Major)
            RETURN m
        `, { id: entity.id });

        const nodes = [];
        for (const rec of records) {
            const majorNode = rec.get('m');
            const major = majorNode.properties;
            nodes.push(this.formatNode(major, 'Major'));
            nodes.push(...await this.resolveMajor(major)); // Deep resolve
        }

        return nodes;
    }

    async resolveMajor(entity) {
        const data = await Neo4jService.query(`
            MATCH (m:Major {id: $id})
            OPTIONAL MATCH (m)<-[:BELONGS_TO]-(mp:MajorProgramme)
            OPTIONAL MATCH (m)-[:HAS_PROGRAMME]->(p:Programme)
            RETURN m, collect(DISTINCT mp) AS majorProgrammes, collect(DISTINCT p) AS programmes
        `, { id: entity.id });

        const record = data[0]; // Neo4jService.query sẽ cần trả ra result.records

        const m = record.get('m').properties;
        const mpList = record.get('majorProgrammes').map(n => n.properties);
        const pList = record.get('programmes').map(n => n.properties);

        const result = [this.formatNode(m, 'Major')];
        for (const mp of mpList) result.push(this.formatNode(mp, 'MajorProgramme'));
        for (const p of pList) result.push(this.formatNode(p, 'Programme'));

        return result;
    }

    async resolveProgramme(entity) {
        const node = await Neo4jService.getById('Programme', entity.id);
        return node ? [this.formatNode(node, 'Programme')] : [];
    }

    async resolveMajorProgramme(entity) {
        const node = await Neo4jService.getById('MajorProgramme', entity.id);
        return node ? [this.formatNode(node, 'MajorProgramme')] : [];
    }

    /**
     * Chuẩn hóa dữ liệu node về dạng tối ưu cho LLM
     * @param {Object} raw - Dữ liệu node từ Neo4j
     * @param {string} label - Label của node
     * @returns {Object} node đã được format
     */
    formatNode(raw, label) {
        const { id, name, description, tab = '', content = {}, ...rest } = raw;
        const cleanedContent = {};
        for (const [key, value] of Object.entries({ ...content, ...rest })) {
            if (!['embedding', 'entityType', 'major_code'].includes(key)) {
                cleanedContent[key] = value;
            }
        }
        return {
            id,
            label,
            name,
            description: description || '',
            tab,
            content: cleanedContent
        };
    }

    // ======================================= VERSION 2 ======================================= //

    /**
     * Truy vấn Neo4j từ các thực thể và mối quan hệ
     * @param {Object} input - { entities: Array, relationships: Array }
     * @returns {Array} Danh sách node liên quan đã được chuẩn hóa
     */
    async retrieve_V2({ entities }) {
        const result = [];
        const visited = new Set();

        // Helper để tránh trùng lặp node
        const addNode = (node, label) => {
            const key = `${label}-${node.name || node.id}`;
            if (!visited.has(key)) {
                visited.add(key);
                result.push(this.formatNode_V2(node, label));
            }
        };

        // block logic
        await this.handleGroups(entities, addNode);
        await this.handleMajors(entities, addNode);
        await this.handleProgrammes(entities, addNode);
        await this.handleMajorProgrammePairs(entities, addNode);
        await this.handleMajorProgrammeEntities(entities, addNode);

        return result;
    }

    /**
     * Lấy node Group và các Major liên quan
     */
    async handleGroups(entities, addNode) {
        const groups = entities.filter(e => e.label === 'Group');
        for (const groupEntity of groups) {
            const similarGroups = await this.findSimilarNodes('Group', groupEntity.name);
            for (const groupNode of similarGroups) {
                addNode(groupNode, 'Group');
                // Lấy Major của groupNode
                const majorsOfGroup = await Neo4jService.query(
                    `MATCH (g:Group)-[:HAS_MAJOR]->(m:Major) WHERE g.id = $id RETURN m`,
                    { id: groupNode.id }
                );
                if (majorsOfGroup) {
                    for (const rec of majorsOfGroup) {
                        addNode(rec.get('m').properties, 'Major');
                    }
                }
            }
        }
    }

    /**
     * Lấy node Major và các Programme liên quan (lọc theo tên nếu có Programme input)
     */
    async handleMajors(entities, addNode) {
        const majors = entities.filter(e => e.label === 'Major');
        const programmes = entities.filter(e => e.label === 'Programme');
        const programmeSet = new Set(programmes.map(p => (p.name || '').toLowerCase()));

        for (const majorEntity of majors) {
            const similarMajors = await this.findSimilarNodes('Major', majorEntity.name);
            for (const majorNode of similarMajors) {
                addNode(majorNode, 'Major');

                // Lấy các Programme liên quan tới Major, chỉ add nếu nằm trong input
                const programmesOfMajor = await Neo4jService.query(
                    `MATCH (m:Major)-[:HAS_PROGRAMME]->(p:Programme) WHERE m.id = $id RETURN p`,
                    { id: majorNode.id }
                );
                if (programmesOfMajor) {
                    for (const rec of programmesOfMajor) {
                        const progNode = rec.get('p').properties;
                        if (programmeSet.size === 0 || programmeSet.has((progNode.name || '').toLowerCase())) {
                            addNode(progNode, 'Programme');
                        }
                    }
                }
            }
        }
    }

    /**
     * Lấy Programme và các Major liên quan qua MajorProgramme, lọc theo Major input nếu có
     */
    async handleProgrammes(entities, addNode) {
        const majors = entities.filter(e => e.label === 'Major');
        const majorSet = new Set(majors.map(m => (m.name || '').toLowerCase()));
        const programmes = entities.filter(e => e.label === 'Programme');

        for (const programmeEntity of programmes) {
            const similarProgrammes = await this.findSimilarNodes('Programme', programmeEntity.name);
            for (const progNode of similarProgrammes) {
                addNode(progNode, 'Programme');

                // Lấy Major liên quan qua MajorProgramme, chỉ add nếu nằm trong input
                const majorsOfProgramme = await Neo4jService.query(
                    `MATCH (p:Programme)-[:IS_INSTANCE_OF]->(mp:MajorProgramme)-[:BELONGS_TO]->(m:Major) WHERE p.id = $id RETURN m`,
                    { id: progNode.id }
                );
                if (majorsOfProgramme) {
                    for (const rec of majorsOfProgramme) {
                        const majorNode = rec.get('m').properties;
                        if (majorSet.size === 0 || majorSet.has((majorNode.name || '').toLowerCase())) {
                            addNode(majorNode, 'Major');
                        }
                    }
                }
            }
        }
    }

    /**
     * Nếu có cả Major và Programme, lấy node MajorProgramme trung gian
     */
    async handleMajorProgrammePairs(entities, addNode) {
        const majors = entities.filter(e => e.label === 'Major');
        const programmes = entities.filter(e => e.label === 'Programme');
        if (majors.length && programmes.length) {
            for (const majorEntity of majors) {
                const similarMajors = await this.findSimilarNodes('Major', majorEntity.name);
                for (const majorNode of similarMajors) {
                    for (const programmeEntity of programmes) {
                        const similarProgrammes = await this.findSimilarNodes('Programme', programmeEntity.name);
                        for (const progNode of similarProgrammes) {
                            const mpNodes = await this.resolveMajorProgrammeRelationship(
                                { id: majorNode.id, name: majorNode.name, label: 'Major' },
                                { id: progNode.id, name: progNode.name, label: 'Programme' }
                            );
                            if (mpNodes && mpNodes.length) {
                                mpNodes.forEach(mpNode => addNode(mpNode, 'MajorProgramme'));
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Xử lý MajorProgramme entity trực tiếp từ input
     */
    async handleMajorProgrammeEntities(entities, addNode) {
        const majorProgrammes = entities.filter(e => e.label === 'MajorProgramme');
        for (const mpEntity of majorProgrammes) {
            const similarMPs = await this.findSimilarNodes('MajorProgramme', mpEntity.name);
            for (const mpNode of similarMPs) {
                addNode(mpNode, 'MajorProgramme');
            }
        }
    }

    /**
     * Helper: tìm các node tương tự dựa trên embedding
     */
    async findSimilarNodes(label, name) {
        if (!name) return [];
        const emb = await LLMService.getEmbeddingV2(name);
        return await Neo4jService.searchNodesByEmbedding(label, emb, 0.8, 5);
    }

    /**
     * Helper: resolve MajorProgramme giữa Major và Programme
     */
    async resolveMajorProgrammeRelationship(major, programme) {
        const nodes = await Neo4jService.query(
            `MATCH (m:Major {id: $majorId})
            OPTIONAL MATCH (m)<-[:BELONGS_TO]-(mp:MajorProgramme)
            OPTIONAL MATCH (m)-[:HAS_PROGRAMME]->(p:Programme)
            WITH m, mp, p
            WHERE p.id = $programmeId OR $programmeId IS NULL
            RETURN DISTINCT mp`,
            { majorId: major.id, programmeId: programme?.id || null }
        );
        // Filter ra các MajorProgramme tồn tại và trả về thuộc tính
        return (nodes || [])
            .map(rec => rec.get('mp'))
            .filter(mp => mp) // loại bỏ null nếu không có MajorProgramme
            .map(mp => mp.properties);
    }

    /**
     * Chuẩn hóa dữ liệu node về dạng tối ưu cho LLM
     */
    formatNode_V2(raw, label) {
        const { id, name, description, tab = '', content = {}, ...rest } = raw;
        const cleanedContent = {};
        for (const [key, value] of Object.entries({ ...content, ...rest })) {
            if (!['embedding', 'entityType', 'major_code'].includes(key)) {
                cleanedContent[key] = value;
            }
        }
        return {
            id,
            label,
            name,
            description: description || '',
            tab,
            content: cleanedContent
        };
    }

    // ======================================= VERSION 3 ======================================= //

    /**
     * Truy vấn Neo4j dựa trên intent và các entity đã được trích xuất.
     * @param {string} intent
     * @param {Array} entities - Danh sách các entity (label + text)
     * @returns {Array} Danh sách node đã format theo chuẩn
     */
    async retrieve_V3({ intent, entities }) {
        const config = intentQueryMap[intent];
        if (!config || !config.cypher) return [];

        // Resolve ID của các entity cần thiết
        const resolvedIds = await this.resolveEntityIds(config.entity_requirements, entities);

        for (const label of config.entity_requirements) {
            const paramKey = label.toLowerCase() + 'Id';
            if (!(paramKey in resolvedIds)) {
                console.warn(`[Retriever] Bỏ qua truy vấn`);
                return [];
            }
        }

        // Truy vấn bằng Cypher
        const records = await Neo4jService.query(config.cypher, resolvedIds);

        // Format kết quả
        return this.formatRecords(records);
    }

    async resolveEntityIds(requiredLabels, entities) {
        const resolved = {};

        for (const label of requiredLabels) {
            const match = entities.find(e => e.label === label);
            if (!match) continue; // Không có entity này

            const similar = await this.findSimilarNodes(label, match.name);
            if (similar.length) {
                resolved[label.toLowerCase() + 'Id'] = similar[0].id;
            }
        }

        return resolved;
    }

    formatRecords(records) {
        const visited = new Set();
        const result = [];

        for (const record of records) {
            for (const [key, value] of record.entries()) {
                const node = value.properties || value;
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                const keyId = `${label}-${node.id || node.name}`;
                if (!visited.has(keyId)) {
                    visited.add(keyId);
                    result.push(this.formatNode(node, label));
                }
            }
        }

        return result;
    }
}

module.exports = new RetrieverQueryBuilder();
