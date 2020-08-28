const RoomManager = require('./src/botutils').RoomManager;
const utils = require('./src/utils');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const TOKEN = fs.readFileSync('token.txt');

const bot = new TelegramBot(TOKEN, {polling: true});
const roomManager = new RoomManager();

function cardToString(card) {
    if (card.endsWith('0')) {
        return card[0] + '10';
    } else if (card.endsWith('1')) {
        return card[0] + 'A';
    } else {
        return card;
    }
}

roomManager.on('room-status-changed', (name, roomObj) => {
    let statusText = `🎮 ${name}:\n\n`;
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
        statusText += `🃏 Top card is ${roomObj.topCard}\n\n`;
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
                const cardText = cardToString(card);
                inlineKeyboardMarkup.inline_keyboard.push([{
                    text: cardText,
                    callback_data: player.chatId == roomObj.currentTurnPlayerChatId ? card : 'dummy'
                }]);
            }
            inlineKeyboardMarkup.inline_keyboard.push([{
                text: '🃏 Grab card',
                callback_data: player.chatId == roomObj.currentTurnPlayerChatId ? 'g' : 'dummy'
            }]);
            bot.editMessageText(statusText, {chat_id: chatId, message_id: messageId, reply_markup: inlineKeyboardMarkup});
        }
    }
});

roomManager.on('everyone-ready', (roomObj) => {
    roomObj.startGame();
});

roomManager.on('grabbed-card', (playerChatId, name, roomObj) => {
    // Don't let the player grab another card!
    const player = roomObj.getPlayerByChatId(playerChatId);
    const chatId = player.chatId;
    const messageId = player.messageId;
    let statusText = `🎮 ${name}:\n\n`
    statusText += `🃏 Top card is ${cardToString(roomObj.topCard)}\n\n`;
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
    const inlineKeyboardMarkup = {
        inline_keyboard: []
    };
    for (let card of player.cards) {
        const cardText = cardToString(card);
        inlineKeyboardMarkup.inline_keyboard.push([{
            text: cardText,
            callback_data: player.chatId == roomObj.currentTurnPlayerChatId ? card : 'dummy'
        }]);
    }
    inlineKeyboardMarkup.inline_keyboard.push([{
        text: '⏭ Skip round',
        callback_data: player.chatId == roomObj.currentTurnPlayerChatId ? 's' : 'dummy'
    }]);
    bot.editMessageText(statusText, {chat_id: chatId, message_id: messageId, reply_markup: inlineKeyboardMarkup});
});

roomManager.on('player-to-fine', (roomObj, card, finerPlayer) => {
    const chatId = finerPlayer.chatId;
    const messageId = finerPlayer.messageId;
    const players = roomObj.players;
    const inlineKeyboardMarkup = {
        inline_keyboard: []
    };
    for (let player of players) {
        if (player == finerPlayer) {
            continue;
        }
        const finedPlayerChatId = player.chatId;
        inlineKeyboardMarkup.inline_keyboard.push([{
            text: player.name,
            callback_data: `f/${finedPlayerChatId}/${card}`
        }]);
    }
    bot.editMessageText('Select a player to fine:', {chat_id: chatId, message_id: messageId, reply_markup: inlineKeyboardMarkup});
});

roomManager.on('game-finished', (name, roomObj) => {
    let statusText = `🎮 ${name}:\n✅ Game finished!\n\n`;
    for (let player of roomObj.players) {
        const topThreeRanks = ['🥇', '🥈', '🥉'];
        if (player.rank <= 3) {
            statusText += `    🔹${topThreeRanks[player.rank - 1]} ${player.name}\n`;
        } else {
            statusText += `    🔹 (#${player.rank}) ${player.name}\n`;
        }
    }
    // Send game status to all players
    for (let player of roomObj.players) {
        const chatId = player.chatId;
        const messageId = player.messageId;
        bot.editMessageText(statusText, {chat_id: chatId, message_id: messageId});
    }
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
    const queryData = query.data;
    const chatId = query.from.id;
    const messageId = query.message.message_id;
    if (queryData.startsWith('f')) {
        // someone should be fined
        const parsedQueryData = queryData.split('/');
        const finedPlayerChatId = parsedQueryData[1];
        const fineCard = parsedQueryData[2];
        const room = roomManager.getRoomByPlayerChatId(chatId);
        const finedPlayerName = room.getPlayerByChatId(finedPlayerChatId).name;
        room.play(fineCard, finedPlayerChatId);
        bot.answerCallbackQuery({callback_query_id: query.id, text: `You fined ${finedPlayerName}`});
        return;
    } else if (queryData == 'r') {
        // Ready state should be changed
        const player = roomManager.getPlayerByChatId(chatId);
        if (player.ready) {
            player.ready = false;
        } else {
            player.ready = true;
        }
    } else if (queryData == 'l') {
        // Leave
        const room = roomManager.getRoomByPlayerChatId(chatId);
        room.removePlayer(chatId);
        bot.deleteMessage(chatId, messageId);
        bot.answerCallbackQuery({callback_query_id: query.id, text: `You left the room.`});
        return;
    } else if (queryData == 'g') {
        // grab Card
        const room = roomManager.getRoomByPlayerChatId(chatId);
        room.giveRandomCardToPlayer(chatId);
    } else if (queryData == 's') {
        // Skip round
        const room = roomManager.getRoomByPlayerChatId(chatId);
        room.skipRound();
    } else if (queryData == 'dummy'){
        bot.answerCallbackQuery({callback_query_id: query.id, text: 'Not your turn!'});
        return;
    } else {
        // its a card
        const card = queryData;
        const room = roomManager.getRoomByPlayerChatId(chatId);
        room.play(card);
        bot.answerCallbackQuery({callback_query_id: query.id, text: `You played ${cardToString(card)}.`});
        return;
    }
    bot.answerCallbackQuery({callback_query_id: query.id})
});