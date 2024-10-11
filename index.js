require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');
const messageHandler = require('./src/handlers/messageHandler');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mateochatbot:xdtL2bYQ9eV3CeXM@gerald.r2hjy.mongodb.net/';
const PORT = process.env.PORT || 3000;
const SESSION_DIR = './session';
const SESSION_FILE = path.join(SESSION_DIR, 'session.json');

async function initializeMongoStore() {
    await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
    });
}

async function getSessionData() {
    try {
        await fs.mkdir(SESSION_DIR, { recursive: true });
        const data = await fs.readFile(SESSION_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

async function saveSessionData(data) {
    await fs.writeFile(SESSION_FILE, JSON.stringify(data, null, 2));
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const initialSessionData = await getSessionData();

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        defaultQueryTimeoutMs: 60000,
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            logger.info('Connected to WhatsApp');
            const sessionData = sock.authState.creds;
            await saveSessionData(sessionData);
        } else if (connection === 'close') {
            logger.info('Connection closed. Attempting to reconnect...');
            setTimeout(connectToWhatsApp, 5000);
        }
    });

    sock.ev.on('messages.upsert', async m => {
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                if (!msg.key.fromMe) {
                    await messageHandler(sock, msg);
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

async function main() {
    try {
        await initializeMongoStore();
        logger.info('Connected to MongoDB');
        await connectToWhatsApp();
        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });

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
