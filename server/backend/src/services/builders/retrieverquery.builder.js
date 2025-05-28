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
    async retrieve_V2({ entities, relationships }) {
        const result = [];
        const visited = new Set();

        console.debug('[RetrieverQueryBuilderV2] Input entities:', entities);
        console.debug('[RetrieverQueryBuilderV2] Input relationships:', relationships);

        // Bước 1: Xử lý các thực thể
        for (const entity of entities) {
            const key = `${entity.label}-${entity.name}`;
            if (visited.has(key)) continue;
            if (entity.label === 'MajorProgramme') continue;
            visited.add(key);

            console.debug(`[RetrieverQueryBuilderV2] Processing entity: ${key}`);
            const node = await Neo4jService.getByName(entity.label, entity.name);
            if (!node) {
                console.warn(`[RetrieverQueryBuilderV2] Node not found: ${key}`);
                continue;
            }

            result.push(this.formatNode(node, entity.label));
        }

        // Bước 2: Xử lý quan hệ dựa trên relation + entities
        for (const rel of relationships) {
            // Kiểm tra quan hệ IS_INSTANCE_OF giữa Major và Programme
            if (rel.relation === "IS_INSTANCE_OF") {
                // Tìm xem nếu có Major và Programme thì không cần thêm MajorProgramme nữa
                const majorEntity = result.find(e => e.label === "Major");
                const programmeEntity = result.find(e => e.label === "Programme");

                if (majorEntity && programmeEntity) {
                    const nodes = await this.resolveMajorProgrammeRelationship(majorEntity, programmeEntity);
                    result.push(...nodes);
                }
            }

            // Xử lý các quan hệ khác
            else {
                // Tìm các entity source-target dựa trên mối quan hệ
                const sourceEntity = entities.find(e => e.name === rel.head);
                const targetEntity = entities.find(e => e.name === rel.tail);

                if (sourceEntity && targetEntity) {
                    const nodes = await this.resolveRelationship(sourceEntity, targetEntity, rel.relation);
                    result.push(...nodes);
                }
            }
        }

        // Bước 3: Loại bỏ trùng lặp
        const deduplicated = Object.values(
            result.reduce((acc, item) => {
                const key = `${item.label}-${item.id}`;
                if (!acc[key]) acc[key] = item;
                return acc;
            }, {})
        );

        console.debug('[RetrieverQueryBuilderV2] Final nodes:', deduplicated);
        return deduplicated;
    }

    /**
     * Xử lý mối quan hệ giữa Major và Programme thông qua MajorProgramme
     * @param {Object} majorEntity - { name, label }
     * @param {Object} programmeEntity - { name, label }
     * @returns {Array} danh sách node liên quan
     */
    async resolveMajorProgrammeRelationship(majorEntity, programmeEntity) {
        const query = `
            MATCH (programme:Programme {name: $programmeName})
            MATCH (major:Major {name: $majorName})
            MATCH (programme)-[:IS_INSTANCE_OF]->(mp:MajorProgramme)-[:BELONGS_TO]->(major)
            RETURN programme, mp, major
        `;
        const params = { programmeName: programmeEntity.name, majorName: majorEntity.name };

        console.debug('[RetrieverQueryBuilderV2] MajorProgramme query:', query, 'Params:', params);

        try {
            const records = await Neo4jService.query(query, params);
            const nodes = [];

            for (const record of records) {
                const programmeNode = record.get('programme').properties;
                const majorProgrammeNode = record.get('mp').properties;
                const majorNode = record.get('major').properties;

                // Chỉ đơn giản trả về các node mà không tính similarity
                nodes.push(this.formatNode(programmeNode, 'Programme'));
                nodes.push(this.formatNode(majorNode, 'Major'));
                nodes.push(this.formatNode(majorProgrammeNode, 'MajorProgramme'));
            }

            return nodes;
        } catch (err) {
            console.error(
                `[RetrieverQueryBuilderV2] Query error for MajorProgramme ${majorEntity.name} -> ${programmeEntity.name}:`,
                err.message
            );
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
