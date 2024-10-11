require('dotenv').config();
const { Client, RemoteAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const CryptoJS = require('crypto-js');
const http = require('http');

const store = new Store('store');

function hashAuthInfo(authInfo) {
  return CryptoJS.MD5(JSON.stringify(authInfo)).toString();
}

const client = new Client({
  authStrategy: new RemoteAuth({
    store: store,
    backupSyncIntervalMs: 300000,
    dataPath: (authInfo) => {
      const hashedPath = hashAuthInfo(authInfo);
      return `./auth/session-${hashedPath}`;
    },
  }),
  puppeteer: {
    args: ['--no-sandbox'],
  }
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.on('remote_session_saved', () => {
  console.log('Remote session saved!');
});

async function initializeClient() {
  try {
    await client.initialize();
  } catch (error) {
    console.error('Failed to initialize client:', error);
    process.exit(1);
  }
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    await initializeClient();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('WhatsApp bot is running!');
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});

main();
