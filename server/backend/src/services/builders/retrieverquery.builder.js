const Neo4jService = require('../chatbots/neo4j.service');
const LLMService = require('../chatbots/llm.service');
const { cosineSimilarity } = require('../../utils/calculator.util');

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
     * Mapping các mối quan hệ hợp lệ giữa các loại thực thể
     * Format: { sourceLabel: { targetLabel: [validRelations] } }
     */
    static RELATION_MAPPING = {
        Group: {
            Major: ['HAS_MAJOR']
        },
        Major: {
            Programme: ['HAS_PROGRAMME'],
            MajorProgramme: ['BELONGS_TO']
        },
        Programme: {},
        MajorProgramme: {}
    };

    /**
     * Truy vấn Neo4j từ các thực thể và mối quan hệ (phiên bản V2)
     * @param {Object} input - { entities: Array, relationships: Array }
     * @returns {Array} danh sách node liên quan
     */
    async retrieve_V2({ entities }) {
        const result = [];
        const visited = new Set();

        const addNode = (node, label) => {
            const key = `${label}-${node.name || node.id}`;
            if (!visited.has(key)) {
                visited.add(key);
                result.push(this.formatNode(node, label));
            }
        };

        // Helper tìm node tương tự theo embedding
        const findSimilarNodes = async (label, name) => {
            const emb = await LLMService.getEmbeddingV2(name);
            return await Neo4jService.searchNodesByEmbedding(label, emb, 0.85, 5);
        };

        // Lấy Group
        const groups = entities.filter(e => e.label === 'Group');
        for (const groupEntity of groups) {
            const similarGroups = await findSimilarNodes('Group', groupEntity.name);
            for (const groupNode of similarGroups) {
                addNode(groupNode, 'Group');
                // Lấy Major của groupNode
                const majorsOfGroup = await Neo4jService.query(
                    `MATCH (g:Group)-[:HAS_MAJOR]->(m:Major) WHERE g.id = $id RETURN m`,
                    { id: groupNode.id }
                );
                for (const rec of majorsOfGroup) addNode(rec.get('m').properties, 'Major');
            }
        }

        // Lấy Major
        const majors = entities.filter(e => e.label === 'Major');
        const programmes = entities.filter(e => e.label === 'Programme');

        const programmeSet = new Set(programmes.map(p => p.name.toLowerCase()));

        // for (const majorEntity of majors) {
        //     const similarMajors = await findSimilarNodes('Major', majorEntity.name);
        //     for (const majorNode of similarMajors) {
        //         addNode(majorNode, 'Major');
        //         // Lấy Programme của majorNode
        //         const programmesOfMajor = await Neo4jService.query(
        //             `MATCH (m:Major)-[:HAS_PROGRAMME]->(p:Programme) WHERE m.id = $id RETURN p`,
        //             { id: majorNode.id }
        //         );
        //         for (const rec of programmesOfMajor) addNode(rec.get('p').properties, 'Programme');
        //     }
        // }

        // // Lấy Programme
        // for (const programmeEntity of programmes) {
        //     const similarProgrammes = await findSimilarNodes('Programme', programmeEntity.name);
        //     for (const progNode of similarProgrammes) {
        //         addNode(progNode, 'Programme');
        //         // Lấy Major liên quan qua MajorProgramme
        //         const majorsOfProgramme = await Neo4jService.query(
        //             `MATCH (p:Programme)-[:IS_INSTANCE_OF]->(mp:MajorProgramme)-[:BELONGS_TO]->(m:Major) WHERE p.id = $id RETURN m`,
        //             { id: progNode.id }
        //         );
        //         for (const rec of majorsOfProgramme) addNode(rec.get('m').properties, 'Major');
        //     }
        // }

        // 1. Xử lý Major A
        for (const majorEntity of majors) {
            const similarMajors = await findSimilarNodes('Major', majorEntity.name);
            for (const majorNode of similarMajors) {
                addNode(majorNode, 'Major');

                // Lấy chương trình của Major mà cũng nằm trong input Programme (lọc theo tên)
                const programmesOfMajor = await Neo4jService.query(
                    `MATCH (m:Major)-[:HAS_PROGRAMME]->(p:Programme) WHERE m.id = $id RETURN p`,
                    { id: majorNode.id }
                );

                for (const rec of programmesOfMajor) {
                    const progNode = rec.get('p').properties;
                    if (programmeSet.has(progNode.name.toLowerCase())) {
                        addNode(progNode, 'Programme');
                    }
                }
            }
        }

        // 2. Xử lý Programme B
        const majorSet = new Set(majors.map(m => m.name.toLowerCase()));

        for (const programmeEntity of programmes) {
            const similarProgrammes = await findSimilarNodes('Programme', programmeEntity.name);
            for (const progNode of similarProgrammes) {
                addNode(progNode, 'Programme');

                // Lấy Major liên quan qua MajorProgramme nhưng chỉ lấy Major cũng nằm trong input Major
                const majorsOfProgramme = await Neo4jService.query(
                    `MATCH (p:Programme)-[:IS_INSTANCE_OF]->(mp:MajorProgramme)-[:BELONGS_TO]->(m:Major) WHERE p.id = $id RETURN m`,
                    { id: progNode.id }
                );

                for (const rec of majorsOfProgramme) {
                    const majorNode = rec.get('m').properties;
                    if (majorSet.has(majorNode.name.toLowerCase())) {
                        addNode(majorNode, 'Major');
                    }
                }
            }
        }

        // Nếu có Major và Programme cùng lúc, lấy MajorProgramme trung gian
        if (majors.length && programmes.length) {
            for (const majorEntity of majors) {
                const similarMajors = await findSimilarNodes('Major', majorEntity.name);
                for (const majorNode of similarMajors) {
                    for (const programmeEntity of programmes) {
                        const similarProgrammes = await findSimilarNodes('Programme', programmeEntity.name);
                        for (const progNode of similarProgrammes) {
                            const mpNodes = await this.resolveMajorProgrammeRelationship(
                                { id: majorNode.id, name: majorNode.name, label: 'Major' },
                                { id: progNode.id, name: progNode.name, label: 'Programme' }
                            );
                            mpNodes.forEach(mpNode => addNode(mpNode, 'MajorProgramme'));
                        }
                    }
                }
            }
        }

        // Xử lý MajorProgramme trực tiếp trong entities
        const majorProgrammes = entities.filter(e => e.label === 'MajorProgramme');
        for (const mpEntity of majorProgrammes) {
            const similarMPs = await findSimilarNodes('MajorProgramme', mpEntity.name);
            for (const mpNode of similarMPs) {
                addNode(mpNode, 'MajorProgramme');
            }
        }

        return result;
    }

    /**
     * Xử lý mối quan hệ giữa Major và Programme thông qua MajorProgramme
     * @param {Object} majorEntity - { name, label }
     * @param {Object} programmeEntity - { name, label }
     * @returns {Array} danh sách node liên quan
     */
    async resolveMajorProgrammeRelationship(majorEntity, programmeEntity) {
        const query = `
            MATCH (programme:Programme {id: $programmeId})
            MATCH (major:Major {id: $majorId})
            MATCH (programme)-[:IS_INSTANCE_OF]->(mp:MajorProgramme)-[:BELONGS_TO]->(major)
            RETURN mp, major, programme
        `;
        const params = { programmeId: programmeEntity.id, majorId: majorEntity.id };

        try {
            const records = await Neo4jService.query(query, params);
            const nodes = [];

            for (const record of records) {
                const mpNode = record.get('mp').properties;
                const majorNode = record.get('major').properties;
                const programmeNode = record.get('programme').properties;

                nodes.push(this.formatNode(mpNode, 'MajorProgramme'));
                nodes.push(this.formatNode(majorNode, 'Major'));
                nodes.push(this.formatNode(programmeNode, 'Programme'));
            }

            return nodes;
        } catch (err) {
            console.error('resolveMajorProgrammeRelationship error:', err);
            return [];
        }
    }

    /**
     * Xây dựng và thực thi truy vấn Cypher dựa trên mối quan hệ
     * @param {Object} headEntity - { name, label }
     * @param {Object} tailEntity - { name, label }
     * @param {string} relation - Tên mối quan hệ
     * @returns {Array} danh sách node liên quan
     */
    async resolveRelationship(headEntity, tailEntity, relation) {
        const query = `
            MATCH (head:${headEntity.label} {name: $headName})
            MATCH (tail:${tailEntity.label} {name: $tailName})
            MATCH (head)-[:${relation}]->(tail)
            RETURN head, tail
        `;
        const params = { headName: headEntity.name, tailName: tailEntity.name };

        console.debug('[RetrieverQueryBuilderV2] Cypher query:', query, 'Params:', params);

        try {
            const records = await Neo4jService.query(query, params);
            const nodes = [];

            for (const record of records) {
                const headNode = record.get('head').properties;
                const tailNode = record.get('tail').properties;
                nodes.push(this.formatNode(headNode, headEntity.label));
                nodes.push(this.formatNode(tailNode, tailEntity.label));
            }

            return nodes;
        } catch (err) {
            console.error(
                `[RetrieverQueryBuilderV2] Query error for ${headEntity.name} -> ${relation} -> ${tailEntity.name}:`,
                err.message
            );
            return [];
        }
    }
}

module.exports = new RetrieverQueryBuilder();
