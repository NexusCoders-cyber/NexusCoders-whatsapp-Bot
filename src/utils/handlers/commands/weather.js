const axios = require('axios');
const config = require('../../config');

module.exports = {
    name: 'weather',
    description: 'Get weather information for a city',
    async execute(sock, msg, args) {
        if (args.length === 0) {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Please provide a city name. Usage: !weather [city]' });
            return;
        }

        const city = args.join(' ');
        const apiKey = config.weatherApiKey;
        const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

        try {
            const response = await axios.get(url);
            const data = response.data;
            const weather = `Weather in ${data.name}:
Temperature: ${data.main.temp}°C
Feels like: ${data.main.feels_like}°C
Humidity: ${data.main.humidity}%
Description: ${data.weather[0].description}`;

            await sock.sendMessage(msg.key.remoteJid, { text: weather });
        } catch (error) {
            console.error('Error fetching weather data:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: 'An error occurred while fetching weather data.' });
        }
    },
};
