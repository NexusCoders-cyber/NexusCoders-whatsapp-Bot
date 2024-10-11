module.exports = {
    name: 'echo',
    description: 'Echoes your message',
    execute: async (msg, args) => {
        const text = args.join(' ');
        if (text) {
            await msg.reply(text);
        } else {
            await msg.reply('Please provide a message to echo.');
        }
    }
};
