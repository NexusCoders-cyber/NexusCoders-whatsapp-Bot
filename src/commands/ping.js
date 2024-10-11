module.exports = {
    name: 'ping',
    description: 'Ping command to check bot responsiveness',
    execute: async (msg) => {
        const start = Date.now();
        const reply = await msg.reply('Pong!');
        const end = Date.now();
        await reply.reply(`Latency: ${end - start}ms`);
    }
};
