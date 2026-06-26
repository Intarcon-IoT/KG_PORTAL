const axios = require('axios');
const thirdPartyConfig = require('../../configThirdParty.json');

const thirdPartyService = {
  getHeaders: (key) => {
    const config = thirdPartyConfig[key];
    return {
      'Content-Type': 'application/json',
      'Authorization': `${config.app_token}`
    };
  },

  syncThirdParty: async (body, action) => {
    const payload = { ...body, action };
    const syncRequests = Object.keys(thirdPartyConfig).map(async (key) => {
      const config = thirdPartyConfig[key];
      if (body.user_uuid === config.uuid) {
        return;
      }

      const headers = thirdPartyService.getHeaders(key);
      const { user_uuid, ...cleanPayload } = payload;

      try {
        await axios.post(config.app_url, cleanPayload, { headers });
      } catch (error) {
        console.error(`ThirdPartySync Error [${key}]:`, error.message);
      }
    });

    await Promise.all(syncRequests);
  }
};

module.exports = thirdPartyService;
