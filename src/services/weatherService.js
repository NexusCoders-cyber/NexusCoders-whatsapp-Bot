const axios = require('axios');

async function getWeather(city) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        return `Weather in ${data.name}: ${data.weather[0].description}, Temperature: ${data.main.temp}°C`;
    } catch (error) {
        throw new Error('Unable to fetch weather data');
    }
}

module.exports = { getWeather };
