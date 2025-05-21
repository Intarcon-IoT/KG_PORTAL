// /**
// * Configuracion del logger.
// */
const winston = require('winston');
const moment = require('moment');
require("winston-daily-rotate-file")
const { format } = require('winston');

exports.init = function () {
  return winston.createLogger({
    transports: [
      new (winston.transports.DailyRotateFile)({
        filename: './logs/%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '14d',
        format: format.combine(
          format.splat(),
          format.simple(),
          format.printf((info) => `${moment(new Date).format("HH:mm:ss")} [${info.level}] : ${info.message}`)
        ),
      }),
    ],
    exitOnError: false,
  });
};
