require('dotenv').config();
const { Client, RemoteAuth } = require('whatsapp-web.js');
const config = require('./config');
const logger = require('./utils/logger');
const messageHandler = require('./src/handlers/messageHandler');

const sessionId = process.env.SESSION_ID || 'nexuscoders-session';

const client = new Client({
    authStrategy: new RemoteAuth({
        store: {},
        clientId: sessionId,
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('ready', () => {
    logger.info('NexusCoders Bot is ready');
});

client.on('message', messageHandler);

client.initialize();

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
});

process.on('SIGINT', async () => {
    logger.info('NexusCoders Bot shutting down...');
    await client.destroy();
    process.exit(0);
});
