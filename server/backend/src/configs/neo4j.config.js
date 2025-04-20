const neo4j = require('neo4j-driver');

// CẤU HÌNH NEO4J
const driver = neo4j.driver(
    process.env.NEO4J_URI || "bolt://localhost:7687",
    neo4j.auth.basic(process.env.NEO4J_USER || "neo4j", process.env.NEO4J_PASSWORD || "password")
);

const getSession = () => driver.session({ database: process.env.NEO4J_DB || "neo4j" });

module.exports = { driver, getSession };