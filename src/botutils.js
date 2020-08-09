const utils = require('./utils');
const EventEmitter = require('events').EventEmitter;

class RoomManager {
    constructor(){
        this._rooms = {};
        this._eventemitter = new EventEmitter();
        this.on = this._eventemitter.on;
    }

    createRoom(creatorPlayer, creatorMessageId, name = 'New room'){
        let creatorChatId = creatorPlayer.chatId;
        let roomObj = new utils.GameRoom();
        roomObj.addPlayer(creatorPlayer);
        let newRoom = {
            name: name,
            roomObj: roomObj,
            messageInfo: [
                {creatorChatId: creatorMessageId}
            ]
        }
        this._rooms[creatorChatId] = newRoom;
        this._eventemitter.emit('room-created'); // TODO provide arguments
    }
}

module.exports.RoomManager = RoomManager;