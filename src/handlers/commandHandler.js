const fs = require('fs');
const path = require('path');

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = new Map();

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    commands.set(command.name, command);
}

async function handleCommand(sock, msg, command, args) {
    if (commands.has(command)) {
        try {
            await commands.get(command).execute(sock, msg, args);
        } catch (error) {
            console.error(`Error executing command ${command}:`, error);
            await sock.sendMessage(msg.key.remoteJid, { text: 'There was an error executing that command.' });
        }
    } else {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Unknown command. Type !help for a list of commands.' });
    }
}

module.exports = { handleCommand };
