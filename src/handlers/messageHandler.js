const config = require('../config');
const commandHandler = require('./commandHandler');

module.exports = async (sock, msg) => {
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (text.startsWith(config.prefix)) {
        await commandHandler(sock, msg);
    }
};
