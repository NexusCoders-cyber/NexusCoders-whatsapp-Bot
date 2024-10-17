const logger = require('../utils/logger')
const commands = require('./commands')

async function messageHandler(sock, msg) {
    try {
        const messageType = Object.keys(msg.message)[0]
        if (!messageType) return

        const isTextMessage = messageType === 'conversation' || messageType === 'extendedTextMessage'
        if (!isTextMessage) return

        const text = msg.message.conversation || msg.message?.extendedTextMessage?.text || ''
        if (!text.startsWith('!')) return

        const [cmdName, ...args] = text.slice(1).toLowerCase().trim().split(' ')
        const command = commands[cmdName]

        if (command) {
            await command(sock, msg, args)
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `⚠️ Command not found. Use !help to see available commands.`
            }, { quoted: msg })
        }

    } catch (error) {
        logger.error('Error in message handler:', error)
        try {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ An error occurred while processing your command.'
            }, { quoted: msg })
        } catch (sendError) {
            logger.error('Error sending error message:', sendError)
        }
    }
}

module.exports = messageHandler
