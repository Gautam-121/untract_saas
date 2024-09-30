const env = require("./dbenv.js");
const pg = require("pg");

const Sequelize = require("sequelize");
const sequelize = new Sequelize(env.database, env.username, env.password, {
  host: env.host,
  dialect: env.dialect,
  dialectModule: pg,
  // operatorsAliases: false,

  pool: {
    max: env.pool.max,
    min: env.pool.min,
    acquire: env.pool.acquire,
    idle: env.pool.idle,
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Use this if you're using a self-signed certificate
    }
  }
});


const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.customers = require("../models/customerModel.js")(sequelize, Sequelize);
db.admins = require("../models/adminModel.js")(sequelize, Sequelize);
db.products = require("../models/productModel.js")(sequelize, Sequelize);
db.subscriptionPlans = require("../models/subscriptionPlanModel.js")(
  sequelize,
  Sequelize
);
db.subscriptions = require("../models/subscriptionModel.js")(
  sequelize,
  Sequelize
);
db.orders = require("../models/orderModel.js")(sequelize, Sequelize);
db.transactions = require("../models/transactionModel.js")(
  sequelize,
  Sequelize
);
db.brandings = require("../models/branding.model.js")(sequelize,Sequelize)
db.campaigns = require("../models/campaign.model.js")(sequelize,Sequelize)
db.clients = require("../models/client.model.js")(sequelize,Sequelize)

// Relationships
db.products.hasMany(db.subscriptionPlans, { as: "subscriptionPlans" });
db.subscriptionPlans.belongsTo(db.products, {
  foreignKey: "productId",
  as: "product",
});

db.customers.hasMany(db.subscriptions, { as: "subscriptions" });
db.subscriptions.belongsTo(db.customers, {
  foreignKey: "customerId",
  as: "customer",
});

db.customers.hasMany(db.orders, { as: "orders" });
db.orders.belongsTo(db.customers, {
  foreignKey: "customerId",
  as: "customer",
});

db.orders.hasMany(db.transactions, {
  foreignKey: "orderId",
  as: "transactions",
});
db.transactions.belongsTo(db.orders, {
  foreignKey: "orderId",
  as: "order",
});

db.brandings.belongsTo(db.customers , { foreignKey: "customerId", as: "customer",})
db.customers.hasMany(db.campaigns , {as: "campaigns"})
db.campaigns.belongsTo(db.customers , {foreignKey: "customerId" , as: "customer"})
db.customers.hasMany(db.clients , {as: "clients"})
db.clients.belongsTo(db.customers , {foreignKey: "customerId" , as: "customer"})

module.exports = db;
