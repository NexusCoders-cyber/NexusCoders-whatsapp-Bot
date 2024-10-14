const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./src/utils/logger');

async function connectToDatabase() {
    try {
        await mongoose.connect(config.mongodbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        logger.info('Connected to MongoDB');
    } catch (error) {
        logger.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}

async function disconnectFromDatabase() {
    try {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    } catch (error) {
        logger.error('Error disconnecting from MongoDB:', error);
        throw error;
    }
}

module.exports = {
    connectToDatabase,
    disconnectFromDatabase
};
