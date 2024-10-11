const fs = require('fs');
const path = require('path');

const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`../commands/${file}`);
    commands.set(command.name, command);
}

module.exports = async (message) => {
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
