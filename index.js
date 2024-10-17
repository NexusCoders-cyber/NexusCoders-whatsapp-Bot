require('dotenv').config();
const { default: makeWASocket, Browsers, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const NodeCache = require('node-cache');
const { connectToDatabase, disconnectFromDatabase } = require('./database');
const logger = require('./src/utils/logger');
const messageHandler = require('./src/handlers/messageHandler');
const config = require('./config');

const msgRetryCounterCache = new NodeCache();
const app = express();
let initialConnection = true;

async function ensureSessionDir() {
    try {
        await fs.mkdir(config.sessionDir, { recursive: true });
    } catch (error) {
        logger.error('Failed to create session directory:', error);
        process.exit(1);
    }
}

async function loadSessionData() {
    if (!process.env.SESSION_DATA) return false;
    try {
        const sessionData = JSON.parse(Buffer.from(process.env.SESSION_DATA, 'base64').toString());
        await fs.writeFile(path.join(config.sessionDir, 'creds.json'), JSON.stringify(sessionData));
        logger.info('Session data loaded from environment variable');
        return true;
    } catch (error) {
        logger.error('Failed to parse or save SESSION_DATA:', error);
        return false;
    }
}

async function connectToWhatsApp() {
    await ensureSessionDir();
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: P({ level: 'silent' }),
        browser: [config.botName, 'Chrome', '22.04.4'],
        msgRetryCounterCache,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: config.autoReconnectInterval,
        getMessage: async (key) => {
            return { conversation: `${config.botName} whatsapp user bot` };
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            logger.info('Connection closed due to ' + JSON.stringify(lastDisconnect?.error) + ', reconnecting ' + shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            if (initialConnection) {
                logger.info('Connected to WhatsApp');
                initialConnection = false;
                try {
                    await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', { text: `${config.botName} is connected and ready to use!` });
                } catch (error) {
                    logger.error('Error sending ready message:', error);
                }
            } else {
                logger.info('Connection reestablished');
            }
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

async function startServer() {
    app.get('/', (req, res) => {
        res.send(`${config.botName} is running!`);
    });

    app.listen(config.port, '0.0.0.0', () => {
        logger.info(`Server running on port ${config.port}`);
    });
}

async function main() {
    try {
        await connectToDatabase();
        
        const sessionExists = await loadSessionData();
        if (!sessionExists) {
            logger.info('No session data found, will use QR code login');
        }
        
        await connectToWhatsApp();
        await startServer();

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
        });

        process.on('SIGINT', async () => {
            logger.info(`${config.botName} shutting down...`);
            try {
                await disconnectFromDatabase();
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        });
    } catch (error) {
        logger.error('Error in main function:', error);
        process.exit(1);
    }
}

main();
