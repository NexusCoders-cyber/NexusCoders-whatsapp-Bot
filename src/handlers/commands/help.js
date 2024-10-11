const fs = require('fs');
const path = require('path');
const config = require('../../config');

module.exports = {
    name: 'help',
    description: 'List all commands or info about a specific command.',
    async execute(sock, msg, args) {
        const commandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js'));
        let helpMessage = 'Here are the available commands:\n\n';

        for (const file of commandFiles) {
            const command = require(path.join(__dirname, file));
            helpMessage += `${config.prefix}${command.name}: ${command.description}\n`;
        }

        await sock.sendMessage(msg.key.remoteJid, { text: helpMessage });
    },
};
