require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');
const messageHandler = require('./src/handlers/messageHandler');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mateochatbot:xdtL2bYQ9eV3CeXM@gerald.r2hjy.mongodb.net/';
const PORT = process.env.PORT || 3000;
const SESSION_DIR = './auth_info_baileys';
const SESSION_DATA = process.env.SESSION_DATA;

async function initializeMongoStore() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        logger.info('Connected to MongoDB');
    } catch (error) {
        logger.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    if (SESSION_DATA) {
        try {
            const sessionData = JSON.parse(Buffer.from(SESSION_DATA, 'base64').toString());
            Object.assign(state, sessionData);
        } catch (error) {
            logger.error('Error parsing SESSION_DATA:', error);
        }
    }

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: !SESSION_DATA,
        defaultQueryTimeoutMs: 60000,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            logger.info('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            logger.info('Connected to WhatsApp');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                if (!msg.key.fromMe) {
                    try {
                        await messageHandler(sock, msg);
                    } catch (error) {
                        logger.error('Error in message handler:', error);
                    }
                }
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    return sock;
}

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('NexusCoders WhatsApp bot is running!');
});

async function startServer() {
    server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
}

function setupKeepAlive() {
    setInterval(() => {
        http.get(`http://localhost:${PORT}`, (res) => {
            if (res.statusCode === 200) {
                logger.info('Keep-alive ping successful');
            } else {
                logger.warn('Keep-alive ping failed');
            }
        }).on('error', (err) => {
            logger.error('Keep-alive error:', err);
        });
    }, 5 * 60 * 1000);
}

async function main() {
    try {
        await initializeMongoStore();
        await connectToWhatsApp();
        await startServer();
        setupKeepAlive();

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
        });

        process.on('SIGINT', async () => {
            logger.info('NexusCoders Bot shutting down...');
            try {
                await mongoose.disconnect();
                server.close();
            } catch (error) {
                logger.error('Error during shutdown:', error);
            }
            process.exit(0);
        });
    } catch (error) {
        logger.error('Error in main function:', error);
        process.exit(1);
    }
}

main();
