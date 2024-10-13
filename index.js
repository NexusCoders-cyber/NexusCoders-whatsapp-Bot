require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');
const messageHandler = require('./src/handlers/messageHandler');
const http = require('http');
const config = require('./config');
const { Boom } = require('@hapi/boom');
const P = require('pino');

async function initializeMongoStore() {
    try {
        await mongoose.connect(config.mongodbUri, {
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
    const { state, saveCreds } = await useMultiFileAuthState(config.sessionDir);

    if (process.env.SESSION_DATA) {
        const sessionData = JSON.parse(Buffer.from(process.env.SESSION_DATA, 'base64').toString());
        Object.assign(state, sessionData);
    }

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: P({ level: config.logLevel }),
        browser: [config.botName, 'Chrome', '22.04.4'],
        version: [2, 2323, 4],
        defaultQueryTimeoutMs: undefined,
        connectTimeoutMs: 60000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        keepAliveIntervalMs: config.autoReconnectInterval,
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
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
            logger.info(`${config.botName} shutting down...`);
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
