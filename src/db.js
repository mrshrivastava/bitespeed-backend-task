const { Sequelize } = require("sequelize");
const DB_FILE = process.env.DATABASE_FILE || './database.sqlite';

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: DB_FILE
});

module.exports = sequelize;
