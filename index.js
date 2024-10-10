require('dotenv').config();
const { Client, RemoteAuth } = require('whatsapp-web.js');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const messageHandler = require('./src/handlers/messageHandler');

const sessionId = process.env.SESSION_ID || 'nexuscoders-session';

const client = new Client({
    authStrategy: new RemoteAuth({
        store: {},
        clientId: sessionId,
        backupSyncIntervalMs: 300000
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    }
});

client.on('ready', () => {
    logger.info('NexusCoders Bot is ready');
});

client.on('message', messageHandler);

client.on('authenticated', () => {
    logger.info('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    logger.error('AUTHENTICATION FAILURE', msg);
});

async function initializeClient() {
    try {
        await client.initialize();
    } catch (error) {
        logger.error('Failed to initialize client:', error);
        process.exit(1);
    }
}

initializeClient();

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('SIGINT', async () => {
    logger.info('NexusCoders Bot shutting down...');
    try {
        await client.destroy();
    } catch (error) {
        logger.error('Error during shutdown:', error);
    }
    process.exit(0);
});
