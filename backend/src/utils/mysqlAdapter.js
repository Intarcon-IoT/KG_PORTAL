const { AsyncLocalStorage } = require('node:async_hooks');
const mysqlAdapter = {};
const logger = require('./logger').init();
const database = require("../connections/mysql");
const pool = database.pool;

const transactionStorage = new AsyncLocalStorage();

mysqlAdapter.getConnection = () => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        logger.error("MYSQL - Error getting connection: " + JSON.stringify(err, null, 2));
        return resolve({ error: true, errorInfo: err });
      }
      resolve(connection);
    });
  });
};

mysqlAdapter.runInTransaction = async (callback) => {
  const connection = await mysqlAdapter.getConnection();
  if (connection.error) {
    throw new Error("No se pudo obtener una conexión a la base de datos.");
  }

  await new Promise((resolve, reject) => {
    connection.beginTransaction((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  try {
    const result = await transactionStorage.run(connection, callback);
    
    await new Promise((resolve, reject) => {
      connection.commit((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    
    return result;
  } catch (error) {
    await new Promise((resolve) => connection.rollback(() => resolve()));
    throw error;
  } finally {
    connection.release();
  }
};

mysqlAdapter.query = (sql, data) => {
  const connection = transactionStorage.getStore() || pool;
  
  return new Promise((resolve, reject) => {
    connection.query(sql, data,
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
