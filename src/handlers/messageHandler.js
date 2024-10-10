const config = require('../config');
const logger = require('../utils/logger');
const commandHandler = require('./commandHandler');
const rateLimiter = require('../utils/rateLimiter');

async function messageHandler(message) {
    if (message.body.startsWith(config.prefix)) {
        const args = message.body.slice(config.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        if (await rateLimiter.checkLimit(message.from)) {
            try {
                await commandHandler.executeCommand(commandName, message, args);
                logger.info(`Command ${commandName} executed by ${message.from}`);
            } catch (error) {
                logger.error(`Error executing command ${commandName}: ${error}`);
                message.reply('There was an error executing that command.');
            }
        } else {
            message.reply('You are sending commands too quickly. Please wait a moment and try again.');
        }
    }
}

module.exports = messageHandler;
