const utils = require('./src/utils');
const botutils = require('./src/botutils');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const TOKEN = fs.readFileSync('token.txt');

const bot = new TelegramBot(TOKEN, {polling: true});
const roomManager = new botutils.RoomManager();
const dialogues = new botutils.DialogueManager('dialogues/', 'fa.json');

function cardToString(card) {
    if (card.endsWith('0')) {
        return card[0] + '10';
    } else if (card.endsWith('1')) {
        return card[0] + 'A';
    } else {
        return card;
    }
}

function stringifyRoomStatusBeforeStart(name, roomObj) {
    let statusText = `🎮 ${name}:\n\n`;
    for (let player of roomObj.players){
        statusText += `    ${player.ready ? '🔥' : '💤'} ${player.name}\n`;
    }
    return statusText;
}

function stringifyRoomStatusAfterStart(name, roomObj) {
    let statusText = `🎮 ${name}:\n\n`;
    statusText += '🃏 ' + dialogues.get('top card is', cardToString(roomObj.topCard));
    statusText += "\n";
    if (roomObj.currentPenalty > 0) {
        statusText += '⚠️ ' + dialogues.get('penalty cards', roomObj.currentPenalty);
        statusText += "\n";
    }
    statusText += '\n';
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
            if (player.rank > 0) {
                statusText += '    🔸';
            } else {
                statusText += '    🔹';
            }
        }
        statusText += ` ${player.name}\n`
    }
    return statusText;
}


roomManager.on('room-status-changed', (name, roomObj) => {
    if (!roomObj.gameStarted){
        // Prepare ready status'
        let statusText = stringifyRoomStatusBeforeStart(name, roomObj);
        for (let player of roomObj.players){
            const chatId = player.chatId;
            const messageId = player.messageId;
            const inlineKeyboardMarkup = { inline_keyboard: [[
                {
                    text: player.ready ? '💤 ' + dialogues.get('not ready'): '🔥 ' + dialogues.get('ready'),
                    callback_data: 'r'
                },
                {
                    text: '🚪 ' + dialogues.get('leave'),
                    callback_data: 'l'
                }
            ]]};
            bot.editMessageText(statusText, {chat_id: chatId, message_id: messageId, reply_markup: inlineKeyboardMarkup});
        } 
    } else {
        // Game ongoing
        const statusText = stringifyRoomStatusAfterStart(name, roomObj);
        // Now send status text to everyone
        for (let player of roomObj.players) {
            const chatId = player.chatId;
            const messageId = player.messageId;
            if (player.rank > 0){
                bot.editMessageText(statusText, {chat_id: chatId, message_id: messageId});
            } else {
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
                    text: '🃏 ' + dialogues.get('grab card'),
                    callback_data: player.chatId == roomObj.currentTurnPlayerChatId ? 'g' : 'dummy'
                }]);
                bot.editMessageText(statusText, {chat_id: chatId, message_id: messageId, reply_markup: inlineKeyboardMarkup});
            }
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
    const statusText = stringifyRoomStatusAfterStart(name, roomObj);
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
        text: '⏭ ' + dialogues.get('skip round'),
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
        if ((player == finerPlayer) || (player.rank > 0)) {
            continue;
        }
        const finedPlayerChatId = player.chatId;
        inlineKeyboardMarkup.inline_keyboard.push([{
            text: player.name,
            callback_data: `f/${finedPlayerChatId}/${card}`
        }]);
    }
    bot.editMessageText(dialogues.get('select a player to fine'), {chat_id: chatId, message_id: messageId, reply_markup: inlineKeyboardMarkup});
});

roomManager.on('game-finished', (name, roomObj) => {
    let statusText = `🎮 ${name}:\n✅ ${dialogues.get('game finished')}\n\n`
    for (let player of roomObj.players) {
        const topThreeRanks = ['🥇', '🥈', '🥉'];
        if (player.rank <= 3) {
            statusText += '    🔹' + dialogues.get('game finished top three rank', topThreeRanks[player.rank - 1], player.name) + '\n';
        } else {
            statusText += '    🔹' + dialogues.get('game finished other players', player.rank, player.name) + '\n';
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
    bot.sendMessage(chatId, dialogues.get('welcome'));
});

bot.onText(/\/start (.+)/, (msg, match) => {
    // Join room
    const creatorChatId = match[1];
    const playerName = msg.from.first_name;
    const chatId = msg.from.id;
    if (roomManager.getRoomByPlayerChatId(chatId)) {
        bot.sendMessage(chatId, dialogues.get('already joined'));
        return;
    }
    const roomInfo = roomManager.getRoomInfoByCreatorChatId(creatorChatId);
    if (!roomInfo) {
        bot.sendMessage(chatId, dialogues.get('invalid link'));
        return;
    }
    const room = roomInfo.roomObj;
    
    const roomInfoPromise = bot.sendMessage(chatId, dialogues.get('please wait'));
    roomInfoPromise.then((roomInfoMessage) => {
        const messageId = roomInfoMessage.message_id;
        room.addPlayer(new utils.Player(playerName, chatId, messageId));
    });

});

bot.onText(/^(\/help)$/, (msg, match) => {
    const chatId = msg.from.id;
    bot.sendMessage(chatId, dialogues.get('help message'));
});

bot.onText(/\/new\ ?(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (roomManager.getPlayerByChatId(chatId)){
        bot.sendMessage(chatId, dialogues.get('already joined'));
        return;
    }
    const playerName = msg.chat.first_name;
    const roomName = match[1] == '' ? dialogues.get('new room') : match[1];
    const creationMessage = bot.sendMessage(chatId, dialogues.get('room created', chatId));
    creationMessage.then((creationMessage) => {
        const roomInfoPromise = bot.sendMessage(chatId, dialogues.get('please wait'));
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
        bot.answerCallbackQuery({callback_query_id: query.id, text: dialogues.get('you fined', finedPlayerName)});
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
        bot.answerCallbackQuery({callback_query_id: query.id, text: dialogues.get('you left')});
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
        bot.answerCallbackQuery({callback_query_id: query.id, text: dialogues.get('not your turn')});
        return;
    } else {
        // its a card
        const card = queryData;
        const room = roomManager.getRoomByPlayerChatId(chatId);
        try{
            room.play(card);
            bot.answerCallbackQuery({callback_query_id: query.id, text: dialogues.get('you played card', cardToString(card))});
        } catch {
            bot.answerCallbackQuery({callback_query_id: query.id, text: dialogues.get('illegal card')});
        }
        return;
    }
    bot.answerCallbackQuery({callback_query_id: query.id})
});