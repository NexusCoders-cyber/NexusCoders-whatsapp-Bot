const { getWeather } = require('../services/weatherService');

module.exports = {
    name: 'weather',
    description: 'Get weather information for a city',
    async execute(message, args) {
        if (args.length === 0) {
            return message.reply('Please provide a city name.');
        }
        const city = args.join(' ');
        try {
            const weatherInfo = await getWeather(city);
            message.reply(weatherInfo);
        } catch (error) {
            message.reply('Sorry, I couldn\'t fetch the weather information.');
        }
    },
};
