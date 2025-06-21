const { app, server } = require("./app");
const elasticClient = require("./configs/elastic.config");
const { checkNeo4jConnection } = require("./configs/neo4j.config");
const User = require("./models/users/user.model");
const seedCommonConfigs = require("./seeds/common.seed");
const LLMService = require("./services/chatbots/llm.service");
const logger = require("./utils/logger.util");

const PORT = process.env.PORT || 5000;

const checkElasticConnection = async () => {
  try {
    const health = await elasticClient.cluster.health();
    logger.info("ElasticSearch connection established", {
      status: health.status,
      module: "ElasticSearch",
    });
  } catch (error) {
    logger.error("Failed to connect to ElasticSearch", {
      error: error.message,
      stack: error.stack,
      module: "ElasticSearch",
    });
    // Có thể thêm logic fallback hoặc thoát ứng dụng
    // process.exit(1);
  }
};

server.listen(PORT, "0.0.0.0", async () => {
  logger.info("Server started", { port: PORT, env: process.env.NODE_ENV });

  // Tạo admin mac dinh
  try {
    await User.createDefaultAdmin();

    logger.info("Default admin loaded", { module: "User" });
  } catch (error) {
    logger.error("Failed to create default admin user", {
      error: error.message,
      stack: error.stack,
      module: "User",
    });
  }

  // Tạo cấu hình chung
  try {
    await seedCommonConfigs();

    logger.info("Default system configs loaded", { module: "Common" });
  } catch (error) {
    logger.error("Failed to create default system configs", {
      error: error.message,
      stack: error.stack,
      module: "Common",
    });
  }

  await checkNeo4jConnection();

  // // Làm nóng mô hình
  // try {
  //   await LLMService.initNER();
  //   logger.info("NER model initialized successfully", { module: "LLMService" });
  // } catch (error) {
  //   logger.error("Failed to initialize NER model", {
  //     error: error.message,
  //     stack: error.stack,
  //     module: "LLMService",
  //   });
  // }

  // // Kiểm tra ElasticSearch
  // await checkElasticConnection();
});