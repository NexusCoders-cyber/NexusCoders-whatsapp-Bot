require('dotenv').config();
const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const messageHandler = require('./src/handlers/messageHandler');
const http = require('http');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mateochatbot:xdtL2bYQ9eV3CeXM@gerald.r2hjy.mongodb.net/';
const sessionId = process.env.SESSION_ID || 'nexuscoders-session';

let store;

async function initializeMongoStore() {
    await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
    });
    store = new MongoStore({ mongoose: mongoose });
}

async function initializeClient() {
    try {
        await initializeMongoStore();
        logger.info('Connected to MongoDB');
    } catch (err) {
        logger.error('MongoDB connection error:', err);
        process.exit(1);
    }

    const client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
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

    try {
        await client.initialize();
    } catch (error) {
        logger.error('Failed to initialize client:', error);
        process.exit(1);
    }

    return client;
}

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('WhatsApp bot is running!');
});

async function main() {
    const client = await initializeClient();

    server.listen(process.env.PORT || 3000, () => {
        logger.info(`Server running on port ${process.env.PORT || 3000}`);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
    });

    process.on('SIGINT', async () => {
        logger.info('NexusCoders Bot shutting down...');
        try {
            await client.destroy();
            await mongoose.disconnect();
            server.close();
        } catch (error) {
            logger.error('Error during shutdown:', error);
        }
        process.exit(0);
    });
}

main().catch(error => {
    logger.error('Error in main function:', error);
    process.exit(1);
});
