module.exports = {
    name: 'ping',
    description: 'Ping!',
    async execute(sock, msg, args) {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Pong!' });
    },
};
