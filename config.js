/* ---> THE NEXUS CODERS WHATSAPP BOT <---
1. YOU CAN CHANGE THE OWNERS NUMBER TO YOURS.
2. ADD YOUR SESSION ID.
3. DO NOT CHANGE THE MONGODB URL IF YOU DON'T HAVE ANY IT MIGHT LEAD TO ERROR.
4. IF YOU HAVE ANY ERROR CONTACT NEXUS TEAM WITH ISSUES.
*/

const sessionId = proc.env.sessionId || 'Nexus-session';
const mongodbUrl = ''; /* notes: do not change else it might lead to error but you can also add your if you have*/
const adminIds = [
  "your_number",
  "your other number",
  "leave this space blank",
];
const botName = proc.env.botName || 'Nexus-MD';
const prefix = proc.env.prefix || '!'; //configure this if you set '' blank bot will have no prefix.
const mode = 'public';

module.export.config
