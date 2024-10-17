require('dotenv').config();
const { default: makeWASocket, Browsers, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const NodeCache = require('node-cache');
const { connectToDatabase, disconnectFromDatabase } = require('./database');
const logger = require('./src/utils/logger');
const messageHandler = require('./src/handlers/messageHandler');
const config = require('./config');

const msgRetryCounterCache = new NodeCache();
const app = express();
let initialConnection = true;
const sessionDir = path.join(process.cwd(), 'auth_info_baileys');

async function ensureSessionDir() {
    try {
        await fs.ensureDir(sessionDir);
        return true;
    } catch (error) {
        logger.error('Failed to create session directory:', error);
        return false;
    }
}

async function writeSessionFile(sessionData, filePath) {
    try {
        await fs.writeFile(filePath, sessionData);
        return true;
    } catch (error) {
        logger.error('Failed to write session file:', error);
        return false;
    }
}

async function loadSessionData() {
    if (!process.env.SESSION_DATA) {
        return false;
    }

    try {
        await ensureSessionDir();
        const sessionData = Buffer.from(process.env.SESSION_DATA, 'base64').toString();
        const filePath = path.join(sessionDir, 'creds.json');
        return await writeSessionFile(sessionData, filePath);
    } catch (error) {
        logger.error('Failed to process session data:', error);
        return false;
    }
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: P({ level: 'silent' }),
        browser: ['NexusCoders-Bot', 'Chrome', '112'],
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined,
        connectTimeoutMs: 60000,
        qrTimeout: 40000,
        getMessage: async () => {
            return { conversation: 'NexusCoders WhatsApp Bot' };
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'connecting') {
            logger.info('Connecting to WhatsApp...');
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            logger.info('Connection closed due to:', lastDisconnect?.error?.output?.payload?.message);
            
            if (shouldReconnect) {
                logger.info('Reconnecting...');
                setTimeout(connectToWhatsApp, 3000);
            }
        }
        
        if (connection === 'open') {
            logger.info('Connected to WhatsApp');
            if (initialConnection) {
                initialConnection = false;
                try {
                    await sock.sendMessage(process.env.OWNER_NUMBER + '@s.whatsapp.net', { 
                        text: 'Bot is online and ready!' 
                    });
                } catch (error) {
                    logger.error('Failed to send startup message:', error);
                }
            }
        }
    });

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        if (process.env.RENDER) {
            const credsFile = await fs.readFile(path.join(sessionDir, 'creds.json'), 'utf8');
            logger.info('New session data generated. Please update your SESSION_DATA env variable with this value:');
            logger.info(Buffer.from(credsFile).toString('base64'));
        }
    });

    sock.ev.on('messages.upsert', async chatUpdate => {
        if (chatUpdate.type === 'notify') {
            for (const msg of chatUpdate.messages) {
                if (!msg.key.fromMe) {
                    try {
                        await messageHandler(sock, msg);
                    } catch (error) {
                        logger.error('Error handling message:', error);
                    }
                }
            }
        }
    });

    return sock;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('NexusCoders WhatsApp Bot is running!');
});

async function startServer() {
    const port = process.env.PORT || 3000;
    app.listen(port, '0.0.0.0', () => {
        logger.info(`Server running on port ${port}`);
    });
}

async function main() {
    try {
        await connectToDatabase();
        await ensureSessionDir();
        await loadSessionData();
        await connectToWhatsApp();
        await startServer();

        process.on('unhandledRejection', (err) => {
            logger.error('Unhandled Rejection:', err);
        });

        process.on('uncaughtException', (err) => {
            logger.error('Uncaught Exception:', err);
        });
    } catch (error) {
        logger.error('Startup error:', error);
        process.exit(1);
    }
}

main();
