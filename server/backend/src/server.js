const { app, server } = require("./app");
const elasticClient = require("./configs/elastic.config");
const { checkNeo4jConnection } = require("./configs/neo4j.config");
const User = require("./models/users/user.model");
const seedCommonConfigs = require("./seeds/common.seed");
const CacheService = require("./services/v2/cachings/cache.service");
const LLMService = require("./services/chatbots/llm.service");
const BotService = require("./services/v2/bots/bot.service");
const logger = require("./utils/logger.util");
const PORT = process.env.PORT || 5000;
const cache = new CacheService(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    ttlSeconds: parseInt(process.env.CACHE_TTL) || 7 * 24 * 60 * 60,
    maxMemoryItems: parseInt(process.env.MAX_CACHE_SIZE) || 2000,
    enableFallback: process.env.ENABLE_FALLBACK !== 'false'
  }
);

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
  await cache.clearAllCaches();

  // Gemini load cấu hình và health check
  // await BotService.initialize();

  // Kiểm tra kết nối Redis
  // try {
  //   logger.info("[Cache] Connecting to Redis...");
  //   await cache.connect();

  //   const isHealthy = await cache.healthCheck();
  //   if (!isHealthy) {
  //     logger.warn("[Cache] Redis is not healthy. Fallback will be used.");
  //   } else {
  //     await cache.createIndexIfNotExists();
  //   }
  // } catch (error) {
  //   logger.error("[Cache] Failed to initialize Redis cache service", error.message);
  // }
});