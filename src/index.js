const express = require("express");
const sequelize = require("./db");
const Contact = require("./models/contact");
const routes = require("./routes");

const app = express();
app.use(express.json());

app.use("/", routes);

const PORT = process.env.PORT || 3000;
sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => console.log("Server running on port 3000"));
});
