const neo4j = require('neo4j-driver');
const logger = require('../utils/logger.util');

// CẤU HÌNH NEO4J
const driver = neo4j.driver(
    process.env.NEO4J_URI || "bolt://localhost:7687",
    neo4j.auth.basic(process.env.NEO4J_USER || "neo4j", process.env.NEO4J_PASSWORD || "password")
);

const getSession = () => driver.session({ database: process.env.NEO4J_DB || "neo4j" });

/**
 * Kiểm tra kết nối Neo4j.
 * Trả về: { success: boolean, message: string, error?: any }
 */
async function checkNeo4jConnection() {
    let session;
    try {
        session = getSession();
        await session.run('RETURN 1');
        
        logger.info('Neo4j connection is healthy!');
    } catch (err) {
        logger.error('Neo4j connection failed!', err);
    } finally {
        if (session) await session.close();
    }
}

module.exports = { neo4j, driver, getSession, checkNeo4jConnection };