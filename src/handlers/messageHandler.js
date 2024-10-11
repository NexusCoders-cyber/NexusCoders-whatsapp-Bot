const config = require('../config');
const commandHandler = require('./commandHandler');

module.exports = async (message) => {
    if (message.body.startsWith(config.prefix)) {
        await commandHandler(message);
    }
};
