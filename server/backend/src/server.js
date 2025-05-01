const app = require("./app");
const User = require("./models/users/user.model");

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => { 
  console.log(`Server running on port ${PORT}`);

  await User.createDefaultAdmin();
});
