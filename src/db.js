const { Sequelize } = require("sequelize");

const sequelize = new Sequelize({
  dialect: "sqlite",   // you can change to "mysql" or "postgres"
  storage: "./database.sqlite"
});

module.exports = sequelize;
