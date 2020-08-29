const utils = require('./utils');
const fs = require('fs');
const { parse } = require('path');
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
            this.emit('game-finished', name, roomObj);
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

class DialogueManager {
    constructor(sourceDirPath = 'dialogues/', dialogueFilePath) {
        this._srcDir = sourceDirPath;
        if (!sourceDirPath.endsWith('/')) {
            this._srcDir += '/';
        }
        this._cacheInterval = 5;
        this._dialogueFilePath = dialogueFilePath;
        this._dialogues = undefined;
        this._lastTimeCached = 0;
        this._cacheDialogues(false);
    }

    _cacheDialogues(async = true) {
        const parseData = (data) => {
            const parsedData = JSON.parse(data.toString());
            const result = {};
            for (let key in parsedData) {
                const lineArray = parsedData[key];
                let value = '';
                for (let line of lineArray) {
                    value += line + '\n';
                }
                result[key] = value.trim();
            }
            this._lastTimeCached = new Date().getTime();
            this._dialogues = result;
        }
        if (async) {
            fs.readFile(this._srcDir + this._dialogueFilePath, (err, data) => {
               parseData(data); 
            });
        } else {
            parseData(fs.readFileSync(this._srcDir + this._dialogueFilePath));
        }
        
    }

    loadFile(pathToFile) {
        this._dialogueFilePath = pathToFile;
        this._cacheDialogues(false);
    }

    get(key, ...formatStrings) {
        const currentTimestamp = new Date().getTime();
        if (currentTimestamp > this._lastTimeCached + this._cacheInterval) {
            this._cacheDialogues();
        }

        const rawDialogue = this._dialogues[key].split('%s');
        let finalDialogue = '';
        let rawDialogueIndex = 0;
        let formatStringsIndex = 0;
        while (rawDialogueIndex < rawDialogue.length && formatStringsIndex < formatStrings.length) {
            finalDialogue += rawDialogue[rawDialogueIndex++] + formatStrings[formatStringsIndex++];
        }
        while (rawDialogueIndex < rawDialogue.length) {
            finalDialogue += rawDialogue[rawDialogueIndex++];
        }
        
        return finalDialogue;
    }

}

module.exports.RoomManager = RoomManager;
module.exports.DialogueManager = DialogueManager;