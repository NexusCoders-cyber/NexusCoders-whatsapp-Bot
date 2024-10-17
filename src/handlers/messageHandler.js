const logger = require('../utils/logger');

async function messageHandler(sock, msg) {
    try {
        const messageType = Object.keys(msg.message)[0];
        if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
            const text = msg.message.conversation || msg.message.extendedTextMessage.text;
            if (text.startsWith('!ping')) {
                await sock.sendMessage(msg.key.remoteJid, { text: 'Pong!' }, { quoted: msg });
            }
        }
    } catch (error) {
        logger.error('Error in message handler:', error);
    }
}

module.exports = messageHandler;
