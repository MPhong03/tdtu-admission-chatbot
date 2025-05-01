const Neo4jService = require('../chatbots/neo4j.service');
const LLMService = require('../chatbots/llm.service');

class RetrieverQueryBuilder {
    /**
     * Truy vấn Neo4j từ các thực thể được nhận diện
     */
    async retrieve(entities, intentFields) {
        const result = [];

        for (const entity of entities) {
            switch (entity.label) {
                case 'Major':
                case 'Programme':
                case 'Group':
                case 'MajorProgramme':
                    const node = await Neo4jService.getById(entity.label, entity.id);
                    if (node) {
                        const { id, name, description, tab = '', content = {}, ...rest } = node;

                        // Các field nào không cố định thì gom vào content
                        const dynamicContent = {};
                        for (const [key, value] of Object.entries(rest)) {
                            if (!['embedding', 'entityType', 'major_code'].includes(key)) {
                                dynamicContent[key] = value;
                            }
                        }

                        result.push({
                            label: entity.label,
                            id: id,
                            name: name,
                            description: description || '',
                            tab: tab,
                            content: { ...content, ...dynamicContent }, // merge lại
                            fields: this.extractFields(node, intentFields)
                        });
                    }
                    break;
            }
        }

        return result;
    }

    /**
     * Extract thông tin các trường cần thiết theo intent
     */
    extractFields(node, intentFields = []) {
        if (!intentFields.length || !node.content) return {};

        const fields = {};
        for (const field of intentFields) {
            if (node.content[field]) {
                fields[field] = node.content[field];
            }
        }
        return fields;
    }
}

module.exports = new RetrieverQueryBuilder();
