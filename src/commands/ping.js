module.exports = {
    name: 'ping',
    description: 'Check bot responsiveness',
    async execute(message, args) {
      try{
        var ping = Date.now();
        var ms = Date.now() - ping;

        await message.reply(`Ping: ${ms}ms`);
      }
   },
};
