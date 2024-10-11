const { handleCommand } = require('./commandHandler');
const rateLimiter = require('./rateLimiter');

async function messageHandler(sock, msg) {
    const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!content.startsWith('!')) return;

    const [command, ...args] = content.slice(1).trim().split(/\s+/);
    const senderId = msg.key.remoteJid;

    if (rateLimiter.isRateLimited(senderId)) {
        await sock.sendMessage(senderId, { text: 'You are sending commands too quickly. Please wait a moment and try again.' });
        return;
    }

    await handleCommand(sock, msg, command.toLowerCase(), args);
}

module.exports = messageHandler;
