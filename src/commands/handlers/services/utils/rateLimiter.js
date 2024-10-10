const { getUser, updateUser } = require('../services/database');
const config = require('../config');
const moment = require('moment-timezone');

async function checkLimit(userId) {
    const user = await getUser(userId) || { id: userId, commandCount: 0, lastCommandTime: 0 };
    const now = moment().tz(config.timeZone).valueOf();

    if (now - user.lastCommandTime < config.rateLimitWindow) {
        if (user.commandCount >= config.rateLimitMax) {
            return false;
        }
    } else {
        user.commandCount = 0;
    }

    user.commandCount++;
    user.lastCommandTime = now;

    await updateUser(user.id, user.commandCount, user.lastCommandTime);
    return true;
}

module.exports = { checkLimit };