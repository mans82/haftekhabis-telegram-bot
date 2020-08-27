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
        roomObj.on('player-removed', () => {
            this.emit('room-status-changed', name, roomObj);
        });
        roomObj.on('ready-changed', () => {
            this.emit('room-status-changed', name, roomObj);
        });
        roomObj.on('everyone-ready', () => {
            this.emit('everyone-ready', roomObj);
        });
        roomObj.on('game-started', () => {
            this.emit('room-status-changed', name, roomObj);
        });
        roomObj.on('turn-changed', () => {
            this.emit('room-status-changed', name, roomObj);
        });
        roomObj.on('grabbed-card', (playerChatId) => {
            this.emit('grabbed-card', playerChatId, name, roomObj);
        });
        roomObj.on('player-to-fine', (card, finerPlayer) => {
            this.emit('player-to-fine', roomObj, card, finerPlayer);
        });
        roomObj.on('game-finished', () => {
            this.emit('game-finished', roomObj);
        });
        roomObj.addPlayer(creatorPlayer);
        this._rooms[creatorChatId] = newRoom;
    }

    getRoomInfoByCreatorChatId(chatId){
        return this._rooms[chatId];
    }

    getRoomByPlayerChatId(chatId) {
        for (let roomInfo of Object.values(this._rooms)){
            const room = roomInfo.roomObj;
            const player = roomInfo.roomObj.getPlayerByChatId(chatId);
            if (player){
                return room;
            }
        }
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