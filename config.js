module.exports = {
    name: 'NexusCoders-Bot',
    owner: process.env.OWNER_NUMBER,
    timezone: 'Asia/Kolkata',
    autoReconnect: true,
    autoReconnectInterval: 5000,
    logLevel: 'info',
    mongodb: {
        uri: process.env.MONGODB_URI,
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }
    }
};
