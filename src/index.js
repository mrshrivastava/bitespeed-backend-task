const express = require("express");
const sequelize = require("./db");
const Contact = require("./models/contact");
const routes = require("./routes");

const app = express();
app.use(express.json());

app.use("/", routes);

sequelize.sync({ alter: true }).then(() => {
  console.log("✅ Database synced");
  app.listen(3000, () => console.log("🚀 Server running on port 3000"));
});
