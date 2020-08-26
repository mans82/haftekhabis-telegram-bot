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
        if (this.getPlayerByChatId(creatorChatId)){
            // Player already playing.
            throw 'Player already playing a game'
        }
        const roomObj = new utils.GameRoom();
        const newRoom = {
            name: name,
            roomObj: roomObj
        }
        roomObj.on('new-player-added', (player) => {
            this.emit('room-status-changed', name, roomObj);
        });
        roomObj.on('ready-changed', () => {
            this.emit('room-status-changed', name, roomObj);
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

    getPlayerByChatId(chatId) {
        for (let roomInfo of Object.values(this._rooms)){
            const player = roomInfo.roomObj.getPlayerByChatId(chatId);
            if (player){
                return player;
            }
        }
    }
}

module.exports.RoomManager = RoomManager;