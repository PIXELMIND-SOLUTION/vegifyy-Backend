const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

// ✅ Category Model
const Category = sequelize.define("Category", {
  categoryName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// ✅ VegFood Model (NO mongoose here)
const VegFood = sequelize.define("VegFood", {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  description: {
    type: DataTypes.STRING
  },
  image: {
    type: DataTypes.STRING
  },
  isVeg: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

// ✅ Define association
Category.hasMany(VegFood, { foreignKey: "categoryId" });
VegFood.belongsTo(Category, { foreignKey: "categoryId" });

sequelize.sync();

module.exports = { Category, VegFood };
