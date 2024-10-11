require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');
const messageHandler = require('./src/handlers/messageHandler');
const http = require('http');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mateochatbot:xdtL2bYQ9eV3CeXM@gerald.r2hjy.mongodb.net/';
const PORT = process.env.PORT || 3000;
const SESSION_ID = process.env.SESSION_ID || 'default_session_id';

async function initializeMongoStore() {
    await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
    });
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            logger.info('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            if(shouldReconnect) {
                connectToWhatsApp();
            }
        } else if(connection === 'open') {
            logger.info('opened connection');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        if(m.type === 'notify') {
            for(const msg of m.messages) {
                if(!msg.key.fromMe) {
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
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
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
