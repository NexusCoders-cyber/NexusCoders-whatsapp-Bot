require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const P = require('pino');
const mongoose = require('mongoose');
const messageHandler = require('./src/handlers/messageHandler');
const http = require('http');
const qrcode = require('qrcode-terminal');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mateochatbot:xdtL2bYQ9eV3CeXM@gerald.r2hjy.mongodb.net/';
const PORT = process.env.PORT || 3000;
const SESSION_DIR = './auth_info_baileys';
const SESSION_DATA = process.env.SESSION_DATA;

async function initializeMongoStore() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
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
            console.error('Error parsing SESSION_DATA:', error);
        }
    }

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
        },
        printQRInTerminal: !SESSION_DATA,
        logger: P({ level: 'silent' }),
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr && !SESSION_DATA) {
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Connected to WhatsApp');
            try {
                await sock.sendMessage('status@broadcast', { text: 'NexusCoders Bot is connected and ready to use!' });
            } catch (error) {
                console.error('Error sending ready message:', error);
            }
        }
    });

    sock.ev.on('messages.upsert', async m => {
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                if (!msg.key.fromMe) {
                    try {
                        console.log('Received message:', JSON.stringify(msg));
                        await messageHandler(sock, msg);
                    } catch (error) {
                        console.error('Error in message handler:', error);
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
        console.log(`Server running on port ${PORT}`);
    });
}

function setupKeepAlive() {
    setInterval(() => {
        http.get(`http://localhost:${PORT}`, (res) => {
            if (res.statusCode === 200) {
                console.log('Keep-alive ping successful');
            } else {
                console.warn('Keep-alive ping failed');
            }
        }).on('error', (err) => {
            console.error('Keep-alive error:', err);
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
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
        });

        process.on('SIGINT', async () => {
            console.log('NexusCoders Bot shutting down...');
            try {
                await mongoose.disconnect();
                server.close();
            } catch (error) {
                console.error('Error during shutdown:', error);
            }
            process.exit(0);
        });
    } catch (error) {
        console.error('Error in main function:', error);
        process.exit(1);
    }
}

start();
