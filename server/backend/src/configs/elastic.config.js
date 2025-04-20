const { Client } = require("@elastic/elasticsearch");

const elasticClient = new Client({
    node: process.env.ELASTICSEARCH_URL,
    auth: {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
    }
});

// Kiểm tra kết nối
const checkConnection = async () => {
    try {
        const health = await elasticClient.cluster.health();
        console.log("ElasticSearch Health:", health);
    } catch (error) {
        console.error("ElasticSearch Error:", error);
    }
};

// checkConnection();

module.exports = elasticClient;
