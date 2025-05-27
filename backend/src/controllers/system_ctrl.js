const version = require('../utils/version');

const systemCtrl = {};

systemCtrl.getVersion = async (req, res) => {
  const v = version.getVersion();

  res.json({
    version: v
  });
}

module.exports = systemCtrl;
