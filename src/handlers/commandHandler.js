const fs = require('fs');
const path = require('path');

const commands = new Map();
const commandsPath = path.join(__dirname, '..', 'commands');

fs.readdirSync(commandsPath).filter(file => file.endsWith('.js')).forEach(file => {
    const command = require(path.join(commandsPath, file));
    commands.set(command.name, command);
});

module.exports = async (message) => {
    if (!message.body.startsWith('!')) return;

    const args = message.body.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!commands.has(commandName)) return;

    try {
        await commands.get(commandName).execute(message, args);
    } catch (error) {
        console.error('Error executing command:', error);
        await message.reply('An error occurred while executing the command.');
    }
};
