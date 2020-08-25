const utils = require('./utils');
const EventEmitter = require('events').EventEmitter;

class RoomManager extends EventEmitter{
    constructor(){
        super();
        this._rooms = {};
        // this._eventemitter = new EventEmitter();
    }

    createRoom(creatorPlayer, creatorMessageId, name = 'New Room'){
        const creatorChatId = creatorPlayer.chatId;
        const roomObj = new utils.GameRoom();
        const newRoom = {
            name: name,
            roomObj: roomObj,
            messageInfo: [
                {creatorChatId: creatorMessageId}
            ]
        }
        roomObj.on('new-player-added', (player) => {
            newRoom.messageInfo[player.chatId] = player.messageId;
            this.emit('new-player-added', roomObj, player);
        });
        roomObj.on('game-started', () => {
            this.emit('game-started', roomObj);
        });
        roomObj.on('turn-changed', () => {
            this.emit('turn-changed', roomObj);
        });
        roomObj.on('player-to-fine', (finerPlayer) => {
            this.emit('player-to-fine', roomObj, finerPlayer);
        });
        roomObj.on('game-finished', () => {
            this.emit('game-finished', roomObj);
        });
        roomObj.addPlayer(creatorPlayer);
        this._rooms[creatorChatId] = newRoom;
        this.emit('new-room-created', name, creatorChatId, creatorMessageId);
    }

    getRoomByCreatorChatId(chatId){
        return this._rooms[chatId];
    }
}

module.exports.RoomManager = RoomManager;