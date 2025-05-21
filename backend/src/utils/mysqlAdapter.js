const mysqlAdapter = {};
const logger = require('./logger').init();

const database = require("../connections/mysql");
const pool = database.pool;


mysqlAdapter.query = (sql, data) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, data,
      (error, elements) => {
        if (error) {
          logger.error("MYSQL - " + JSON.stringify(error, null, 2));
          return resolve({ error: true, errorInfo: error });
        }
        return resolve(elements);
      });
  });
};

module.exports = mysqlAdapter;
