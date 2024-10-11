const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');

module.exports = {
    name: 'sticker',
    description: 'Convert an image to a sticker',
    async execute(sock, msg, args) {
        const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg || !quotedMsg.imageMessage) {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Please reply to an image with !sticker to create a sticker.' });
            return;
        }

        try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            const sticker = await sharp(buffer)
                .resize(512, 512, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp()
                .toBuffer();

            await sock.sendMessage(msg.key.remoteJid, { sticker: sticker });
        } catch (error) {
            console.error('Error creating sticker:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: 'An error occurred while creating the sticker.' });
        }
    },
};
