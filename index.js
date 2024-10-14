require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const P = require('pino');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { connectToDatabase, disconnectFromDatabase } = require('./database');
const logger = require('./src/utils/logger');
const messageHandler = require('./src/handlers/messageHandler');
const config = require('./config');

async function ensureSessionDir() {
    try {
        await fs.mkdir(config.sessionDir, { recursive: true });
    } catch (error) {
        logger.error('Failed to create session directory:', error);
        process.exit(1);
    }
}

async function connectToWhatsApp() {
    await ensureSessionDir();
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);

    if (process.env.SESSION_DATA) {
        try {
            const sessionData = JSON.parse(Buffer.from(process.env.SESSION_DATA, 'base64').toString());
            await fs.writeFile(path.join(config.sessionDir, 'creds.json'), JSON.stringify(sessionData));
            logger.info('Session data loaded from environment variable');
        } catch (error) {
            logger.error('Failed to parse or save SESSION_DATA:', error);
        }
    }

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Enable QR code in terminal for initial setup
        logger: P({ level: config.logLevel }),
        browser: [config.botName, 'Chrome', '22.04.4'],
        version: [2, 2323, 4],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: config.autoReconnectInterval,
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
            logger.info('Connected to WhatsApp');
            try {
                await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', { text: `${config.botName} is connected and ready to use!` });
            } catch (error) {
                logger.error('Error sending ready message:', error);
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

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end(`${config.botName} is running!`);
});

async function startServer() {
    server.listen(config.port, '0.0.0.0', () => {
        logger.info(`Server running on port ${config.port}`);
    });
}

function setupKeepAlive() {
    setInterval(() => {
        http.get(`http://localhost:${config.port}`, (res) => {
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
        await connectToDatabase();
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
            logger.info(`${config.botName} shutting down...`);
            try {
                await disconnectFromDatabase();
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
