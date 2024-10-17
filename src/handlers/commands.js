const path = require('path')
const logger = require('../utils/logger')

const commands = {
    async help(sock, msg) {
        const helpText = `*╭─「 𝙉𝙚𝙭𝙪𝙨𝘾𝙤𝙙𝙚𝙧𝙨 𝘽𝙤𝙩 」*
│
├ !help - Show this menu
├ !info - Bot information
├ !ping - Test bot response
├ !owner - Bot owner info
├ !status - Server status
├ !alive - Bot status
├ !menu - Show full menu
├ !speed - Connection speed
├ !runtime - Bot uptime
├ !sticker - Create sticker
├ !quote - Random quote
├ !weather - Get weather
│
╰────────────────`

        await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg })
    },

    async info(sock, msg) {
        const infoText = `╭━━━[ 𝙉𝙚𝙭𝙪𝙨𝘾𝙤𝙙𝙚𝙧𝙨 ]━━━
┃
┃ *Bot Name:* NexusCoders Bot
┃ *Version:* 1.0.0
┃ *Platform:* WhatsApp
┃ *Language:* JavaScript
┃ *Runtime:* Node.js
┃ *Database:* MongoDB
┃ *Framework:* Baileys
┃
╰━━━━━━━━━━━━━━━`

        await sock.sendMessage(msg.key.remoteJid, { text: infoText }, { quoted: msg })
    },

    async ping(sock, msg) {
        const start = Date.now()
        await sock.sendMessage(msg.key.remoteJid, { text: '📍 Measuring ping...' }, { quoted: msg })
        const end = Date.now()
        const ping = end - start

        const responseText = `*🏓 Pong!*\n\n*Speed:* ${ping}ms\n*Status:* Active`
        await sock.sendMessage(msg.key.remoteJid, { text: responseText }, { quoted: msg })
    },

    async alive(sock, msg) {
        const aliveText = `\`\`\`
╔══════════════════╗
║ 𝙉𝙚𝙭𝙪𝙨𝘾𝙤𝙙𝙚𝙧𝙨 𝘽𝙤𝙩
╠══════════════════╣
║ Status: Online   ║
║ Mode: Public     ║
║ Service: Active  ║
╚══════════════════╝
\`\`\``

        await sock.sendMessage(msg.key.remoteJid, { text: aliveText }, { quoted: msg })
    },

    async menu(sock, msg) {
        const menuText = `*╭─「 𝙉𝙚𝙭𝙪𝙨𝘾𝙤𝙙𝙚𝙧𝙨 𝙈𝙚𝙣𝙪 」*
│
├ 🤖 *Bot Commands*
│ !help, !info, !ping
│
├ 🛠️ *Utility Commands*
│ !sticker, !weather
│ !calc, !translate
│
├ ℹ️ *Info Commands*
│ !status, !speed
│ !runtime, !alive
│
├ 👥 *Group Commands*
│ !add, !kick, !promote
│ !demote, !groupinfo
│
├ 🎮 *Fun Commands*
│ !quote, !joke, !meme
│
╰────────────────`

        await sock.sendMessage(msg.key.remoteJid, { text: menuText }, { quoted: msg })
    },

    async owner(sock, msg) {
        const ownerText = `*╭─「 𝙉𝙚𝙭𝙪𝙨𝘾𝙤𝙙𝙚𝙧𝙨 𝙊𝙬𝙣𝙚𝙧 」*
│
├ Name: NexusCoders
├ Number: wa.me/${process.env.OWNER_NUMBER}
├ GitHub: github.com/NexusCoders
├ Website: nexuscoders.com
│
╰────────────────`

        await sock.sendMessage(msg.key.remoteJid, { text: ownerText }, { quoted: msg })
    },

    async runtime(sock, msg) {
        const uptime = process.uptime()
        const hours = Math.floor(uptime / 3600)
        const minutes = Math.floor((uptime % 3600) / 60)
        const seconds = Math.floor(uptime % 60)

        const runtimeText = `*╭─「 𝙉𝙚𝙭𝙪𝙨𝘾𝙤𝙙𝙚𝙧𝙨 𝙍𝙪𝙣𝙩𝙞𝙢𝙚 」*
│
├ Uptime: ${hours}h ${minutes}m ${seconds}s
│
╰────────────────`

        await sock.sendMessage(msg.key.remoteJid, { text: runtimeText }, { quoted: msg })
    },

    async status(sock, msg) {
        const statusText = `*╭─「 𝙉𝙚𝙭𝙪𝙨𝘾𝙤𝙙𝙚𝙧𝙨 𝙎𝙩𝙖𝙩𝙪𝙨 」*
│
├ RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
├ CPU: ${process.cpuUsage().user / 1000}%
├ Platform: ${process.platform}
├ Node: ${process.version}
│
╰────────────────`

        await sock.sendMessage(msg.key.remoteJid, { text: statusText }, { quoted: msg })
    },

    async sticker(sock, msg) {
        if (!msg.message.imageMessage) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Please send an image with caption !sticker'
            }, { quoted: msg })
            return
        }

        try {
            const buffer = await downloadMediaMessage(msg, 'buffer')
            const sticker = await generateSticker(buffer)
            await sock.sendMessage(msg.key.remoteJid, { sticker }, { quoted: msg })
        } catch (error) {
            logger.error('Error creating sticker:', error)
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Failed to create sticker'
            }, { quoted: msg })
        }
    }
}

module.exports = commands
