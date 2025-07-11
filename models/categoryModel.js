const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize("sqlite::memory:"); // Or connect with your preferred DB

const Category = sequelize.define("Category", {
  categoryName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

sequelize.sync();

module.exports = Category;
