const fs = require('fs');
const path = require('path');

const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(__dirname, '../commands', file));
    commands.set(command.name, command);
}

async function executeCommand(commandName, message, args) {
    if (commands.has(commandName)) {
        await commands.get(commandName).execute(message, args);
    } else {
        message.reply('Unknown command. Type !help to see available commands.');
    }
}

module.exports = { executeCommand, commands };
