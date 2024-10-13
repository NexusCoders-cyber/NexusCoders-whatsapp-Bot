require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');
const messageHandler = require('./src/handlers/messageHandler');
const http = require('http');
const config = require('./config');

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
        const sessionData = JSON.parse(Buffer.from(SESSION_DATA).toString());
        Object.assign(state, sessionData);
    }

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        defaultQueryTimeoutMs: 60000,
        forceLogin: true,
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
                await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', { text: 'NexusCoders Bot is connected and ready to use!' });
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
    res.end('NexusCoders WhatsApp bot is running!');
});

async function startServer() {
    server.listen(PORT, '0.0.0.0', () => {
        logger.info('Server running on port ' + PORT);
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
