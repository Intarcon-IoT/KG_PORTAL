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

      // fetch no lanza con 4xx/5xx; el límite evita que una app colgada bloquee la reserva
      try {
        const res = await fetch(config.app_url, { method: 'POST', headers, body: JSON.stringify(cleanPayload), signal: AbortSignal.timeout(10000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch (error) {
        console.error(`ThirdPartySync Error [${key}]:`, error.message);
      }
    });

    await Promise.all(syncRequests);
  }
};

module.exports = thirdPartyService;
