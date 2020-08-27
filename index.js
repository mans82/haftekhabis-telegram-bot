const RoomManager = require('./src/botutils').RoomManager;
const utils = require('./src/utils');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const TOKEN = fs.readFileSync('token.txt');

const bot = new TelegramBot(TOKEN, {polling: true});
const roomManager = new RoomManager();

roomManager.on('room-status-changed', (name, roomObj) => {
    let statusText = `🎮 ${name}:\n\n`
    if (!roomObj.gameStarted){
        // Prepare ready status'
        for (let player of roomObj.players){
            statusText += `    ${player.ready ? '🔥' : '💤'} ${player.name}\n`;
        }
        for (let player of roomObj.players){
            const chatId = player.chatId;
            const messageId = player.messageId;
            const inlineKeyboardMarkup = {
                inline_keyboard:
                    [
                        [
                            {
                                text: player.ready ? '💤 Not ready!' : '🔥 Ready!',
                                callback_data: 'r'
                            },
                            {
                                text: '🚪 Leave',
                                callback_data: 'l'
                            }
                        ]
                    ]
            }
            bot.editMessageText(statusText, {chat_id: chatId, message_id: messageId, reply_markup: inlineKeyboardMarkup});
        } 
    } else {
        // Game ongoing
        // Prepare status text
        statusText += `🃏 Top card is ${roomObj.topCard}\n\n`
        for (let player of roomObj.players){
            if (player.chatId == roomObj.currentTurnPlayerChatId) {
                if (roomObj.flow == +1) {
                    // Current player's turn. Flow downward.
                    statusText += '    🔻';
                } else {
                    // Current player's turn. Flow upward.
                    statusText += '    🔺';
                }
            } else {
                // Not current player's turn.
                statusText += '    🔹';
            }
            statusText += ` ${player.name}\n`
        }
        // Now send status text to everyone
        for (let player of roomObj.players) {
            const chatId = player.chatId;
            const messageId = player.messageId;
            const inlineKeyboardMarkup = {
                inline_keyboard: []
            };
            for (let card of player.cards) {
                // TODO print card names correctly
                inlineKeyboardMarkup.inline_keyboard.push([{
                    text: card,
                    callback_data: player.chatId == roomObj.currentTurnPlayerChatId ? card : 'dummy'
                }]);
            }
            bot.editMessageText(statusText, {chat_id: chatId, message_id: messageId, reply_markup: inlineKeyboardMarkup});
        }
    }
});

roomManager.on('everyone-ready', (roomObj) => {
    roomObj.startGame();
});

bot.onText(/^(\/start)$/, (msg, match) => {
    // Send welcome message
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Welcome!');
});

bot.onText(/\/start (.+)/, (msg, match) => {
    // Join room
    const creatorChatId = match[1];
    const playerName = msg.from.first_name;
    const chatId = msg.from.id;
    if (roomManager.getRoomByPlayerChatId(chatId)) {
        bot.sendMessage(chatId, 'You have already joined a room!');
        return;
    }
    const room = roomManager.getRoomInfoByCreatorChatId(creatorChatId).roomObj;
    
    const roomInfoPromise = bot.sendMessage(chatId, 'Please wait...');
    roomInfoPromise.then((roomInfoMessage) => {
        const messageId = roomInfoMessage.message_id;
        room.addPlayer(new utils.Player(playerName, chatId, messageId));
    });

});

bot.onText(/\/new\ ?(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (roomManager.getPlayerByChatId(chatId)){
        bot.sendMessage(chatId, 'You have already joined a room!');
        return;
    }
    // const messageId = msg.message_id;
    const playerName = msg.chat.first_name;
    const roomName = match[1] == '' ? undefined : match[1];
    const creationMessage = bot.sendMessage(chatId, `Room created. Share this link to others to join:\nt.me/haftekhabisbot?start=${chatId}`)
    creationMessage.then((creationMessage) => {
        const roomInfoPromise = bot.sendMessage(chatId, 'Please wait...');
        roomInfoPromise.then((roomInfoMessage) => {
            const messageId = roomInfoMessage.message_id;
            roomManager.createRoom(new utils.Player(playerName, chatId, messageId), roomName);
        });
    });
});

bot.on('callback_query', (query) => {
    bot.answerCallbackQuery({callback_query_id: query.id})
    const queryData = query.data;
    const chatId = query.from.id;
    const messageId = query.message.message_id;
    if (queryData == 'r') {
        // Ready state should be changed
        const player = roomManager.getPlayerByChatId(chatId);
        if (player.ready) {
            player.ready = false;
        } else {
            player.ready = true;
        }
    } else if (queryData == 'l') {
        const room = roomManager.getRoomByPlayerChatId(chatId);
        room.removePlayer(chatId);
        bot.deleteMessage(chatId, messageId);
    } else if (queryData == 'dummy'){
        return;
    } else {
        // its a card
        const card = queryData;
        const room = roomManager.getRoomByPlayerChatId(chatId);
        room.play(card);
    }
});