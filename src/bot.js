const telegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const utils = require('./utils');

const TOKEN = fs.readFileSync('../token.txt').toString();
const bot = new telegramBot(TOKEN, {polling: true});

let rooms = {};

bot.onText(/^\/start$/, (message, match) => {
    bot.sendMessage(message.chat.id, 'Welcome to HaftKhabis Bot!');
});

bot.onText(/^(\/new)/, (message, match) => {
    const chatId = message.chat.id;
    const messageId = message.message_id;

    let room_data = {
        roomObj: new utils.GameRoom(),
        messageList: {}
    };
    room_data.messageList[chatId] = messageId;
    rooms[chatId] = room_data;
    bot.sendMessage(chatId, 
        `Room Created! Share this like with your friends so they can join:\nhttps://t.me/haftekhabisbot?start=${chatId}`
    );
});