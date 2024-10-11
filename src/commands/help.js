const fs = require('fs');
const path = require('path');
const config = require('../config');

module.exports = {
    name: 'help',
    description: 'List all available commands or get specific command info',
    execute: async (message, args) => {
        const currentTime = new Date().toLocaleTimeString();
        const username = message.from.split('@')[0];
        const commandFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.js'));

        if (!args.length) {
            let helpText = `Hello ${username} ${currentTime}
❄ Creator : NexusCoders
❄ User : ${username}
❄ Status : free
❄ Mode : Public
❄ Bot Name : NexusCoders Bot
❄ Prefix : ${config.prefix}
*COMMANDS*
┏━━━━━━━━━━━\n`;

            for (const file of commandFiles) {
                const command = require(path.join(__dirname, file));
                helpText += `❏${config.prefix}${command.name}: ${command.description}\n`;
            }

            helpText += `┗━━━━━━━━━━
𝗰𝗿𝗲𝗮𝘁𝗲𝗱 𝗯𝘆 𝗡𝗲𝘅𝘂𝘀𝗖𝗼𝗱𝗲𝗿𝘀`;

            await message.reply(helpText);
        } else {
            const commandName = args[0].toLowerCase();
            const command = commandFiles.find(file => file.toLowerCase() === `${commandName}.js`);

            if (!command) {
                await message.reply(`Command "${commandName}" not found.`);
                return;
            }

            const commandModule = require(path.join(__dirname, command));
            const helpText = `Command: ${config.prefix}${commandModule.name}
Description: ${commandModule.description}`;

            await message.reply(helpText);
        }
    },
};
