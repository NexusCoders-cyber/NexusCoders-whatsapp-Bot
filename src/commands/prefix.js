const logger = require('../logger');
const prefix = global.('../config.js').prefix;

module.exports = {
  name: 'prefix',
  description: '',
  async execute(global, event, client, message, args) {
    try {
      const myPrefix = 'my prefix is: ${prefix}\nonline: \n⟩ type ${prefix}help to see my commands.\n⟩ Nexus-MD: thank you for choosing us.';

      if (event.body && event.body.toLowerCase() === "prefix") {
        await message.reply(myPrefix);
      },

      logger.info('prefix: ${prefix}');
    } catch (error) {
      logger.info('error oops');
      return message.reply('error, my bad');
    }
  },
};
