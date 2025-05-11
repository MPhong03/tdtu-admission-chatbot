const { app, server } = require("./app");
const User = require("./models/users/user.model");
const LLMService = require("./services/chatbots/llm.service");

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => { 
  console.log(`Server running on port ${PORT}`);

  await User.createDefaultAdmin();

  // Làm nóng mô hình
  await LLMService.initNER();
});
