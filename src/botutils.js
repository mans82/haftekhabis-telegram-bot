const utils = require('./utils');
const EventEmitter = require('events').EventEmitter;

class RoomManager extends EventEmitter{
    constructor(){
        super();
        this._rooms = {};
        // this._eventemitter = new EventEmitter();
    }

    createRoom(creatorPlayer, name = 'New Room'){
        const creatorChatId = creatorPlayer.chatId;
        const roomObj = new utils.GameRoom();
        const newRoom = {
            name: name,
            roomObj: roomObj,
            messageInfo: [
                {creatorChatId: creatorPlayer.messageId}
            ]
        }
        roomObj.on('new-player-added', (player) => {
            newRoom.messageInfo[player.chatId] = player.messageId;
            this.emit('room-status-changed', name, roomObj);
        });
        roomObj.on('ready-changed', () => {
            this.emit('room-status-changed');
        })
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
    }

    getRoomByCreatorChatId(chatId){
        return this._rooms[chatId];
    }
}

module.exports.RoomManager = RoomManager;