require('dotenv').config();

module.exports = {
    ownerNumber: process.env.OWNER_NUMBER || '2347075663318',
    prefix: process.env.PREFIX || '!',
    mongodbUri: process.env.MONGODB_URI || 'mongodb+srv://mateochatbot:xdtL2bYQ9eV3CeXM@gerald.r2hjy.mongodb.net/',
    port: process.env.PORT || 3000,
    sessionDir: './auth_info_baileys',
};
