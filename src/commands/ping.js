module.exports = {
    name: 'ping',
    execute: async (msg, args) => {
        const start = Date.now();
        const reply = await msg.reply('Pong!');
        const end = Date.now();
        await reply.reply(`Latency: ${end - start}ms`);
    }
};
