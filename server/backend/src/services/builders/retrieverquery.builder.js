const Neo4jService = require('../chatbots/neo4j.service');
const LLMService = require('../chatbots/llm.service');

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
}

module.exports = new RetrieverQueryBuilder();
